/**
 * DPoP (Demonstrating Proof of Possession) proof builder and verifier.
 *
 * DPoP binds an HTTP request to a browser-held private key so that a stolen
 * session cookie is useless without the matching key. Every protected request
 * carries a signed proof JWT; the server verifies the signature against the
 * public key stored in the session.
 *
 * Spec: RFC 9449 — OAuth 2.0 Demonstrating Proof of Possession
 *   https://www.rfc-editor.org/rfc/rfc9449
 *
 * Signing algorithm: ECDSA P-256 / SHA-256 (ES256) via the Web Cryptography API
 *   https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign
 *
 * All encoding uses base64url (RFC 4648 §5) — standard base64 with + → -, / → _,
 * and padding stripped.
 *   https://www.rfc-editor.org/rfc/rfc4648#section-5
 */

/** Encodes a string or binary buffer as unpadded base64url. */
function base64urlEncode(data: ArrayBuffer | string): string {
  let binary = ''
  const bytes =
    typeof data === 'string'
      ? new TextEncoder().encode(data)
      : new Uint8Array(data)
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Decodes an unpadded base64url string back to bytes.
 *
 * Returns the Uint8Array view rather than its backing `.buffer` on purpose.
 * Edge middleware runs inside a Node `vm` realm, and Node's WebCrypto argument
 * converter rejects a bare ArrayBuffer created in another realm ("3rd argument
 * is not instance of ArrayBuffer, Buffer, TypedArray, or DataView"). Typed-array
 * views are checked with a cross-realm-safe test and are accepted.
 */
function base64urlDecodeToBytes(str: string): Uint8Array<ArrayBuffer> {
  // Re-add standard base64 characters and padding before passing to atob.
  const padded =
    str.replace(/-/g, '+').replace(/_/g, '/') +
    '=='.slice(0, (4 - (str.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/** ECDSA P-256 / SHA-256 algorithm parameters used for both sign and verify. */
const ECDSA_PARAMS = { name: 'ECDSA', hash: { name: 'SHA-256' } } as const

/**
 * Builds a DPoP proof JWT for a single HTTP request.
 *
 * The proof is a compact JWT (header.payload.signature) signed with the
 * session's non-exportable private key. It binds the HTTP method and URL
 * path so the proof cannot be reused for a different request.
 *
 * Called by the window.fetch interceptor in _app.tsx before every request.
 *
 * @param privateKey  Non-exportable ECDSA P-256 CryptoKey from IndexedDB.
 * @param pathname    URL path of the request (e.g. "/api/maintenance/update").
 *                    Query string is excluded to avoid mismatch with the server.
 * @param method      HTTP method (GET, POST, etc.).
 * @returns           Compact JWT string suitable for the x-dpop-proof header.
 */
export async function buildDpopProof(
  privateKey: CryptoKey,
  pathname: string,
  method: string
): Promise<string> {
  const header = { alg: 'ES256', typ: 'dpop+jwt' }
  const payload = {
    htm: method.toUpperCase(),  // HTTP method binding (RFC 9449 §4.2)
    htu: pathname,              // HTTP URI binding — path only, no query string
    iat: Math.floor(Date.now() / 1000),  // issued-at timestamp (Unix seconds)
    jti: crypto.randomUUID(),   // unique token ID for replay detection
  }

  const headerB64 = base64urlEncode(JSON.stringify(header))
  const payloadB64 = base64urlEncode(JSON.stringify(payload))
  // The signing input is the ASCII bytes of "header.payload" — standard JWT signing.
  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`)

  const signature = await crypto.subtle.sign(ECDSA_PARAMS, privateKey, signingInput)
  return `${headerB64}.${payloadB64}.${base64urlEncode(signature)}`
}

/**
 * Verifies a DPoP proof JWT on the server side.
 *
 * Performs all security checks required by RFC 9449:
 *   1. Structural validity — exactly three JWT segments.
 *   2. Timestamp (iat) within ±30 seconds of server time — prevents use of
 *      stale captured proofs outside a narrow replay window.
 *   3. Method (htm) and path (htu) match the current request — proves the proof
 *      was created specifically for this request, not replayed from another.
 *   4. Token ID (jti) not previously seen — prevents replay within the time window.
 *   5. Cryptographic signature valid against the session's bound public key.
 *
 * Called by middleware.ts on every protected route.
 *
 * @param proof              The x-dpop-proof header value from the request.
 * @param publicKeyJwk       The boundPublicKey stored in the NextAuth session JWT.
 *                           See: https://www.rfc-editor.org/rfc/rfc7517 (JWK format)
 * @param method             HTTP method of the incoming request.
 * @param pathname           URL path of the incoming request.
 * @param checkAndRecordJti  Replay-detection callback — returns false if the jti
 *                           has already been seen, true and records it if not.
 * @returns                  true if all checks pass, false otherwise.
 *                           Any exception during verification returns false rather
 *                           than propagating, so a malformed proof cannot crash
 *                           the middleware.
 */
export async function verifyDpopProof(
  proof: string,
  publicKeyJwk: JsonWebKey,
  method: string,
  pathname: string,
  checkAndRecordJti: (jti: string) => boolean
): Promise<boolean> {
  try {
    const parts = proof.split('.')
    if (parts.length !== 3) return false  // not a valid compact JWT
    const [headerB64, payloadB64, sigB64] = parts

    const payload = JSON.parse(
      new TextDecoder().decode(base64urlDecodeToBytes(payloadB64))
    )

    // Reject proofs older than 30 seconds or timestamped more than 30 seconds
    // in the future (tolerates minor clock skew between client and server).
    if (Math.abs(Math.floor(Date.now() / 1000) - payload.iat) > 30) return false

    // Verify the proof was created for this specific method and path.
    if (payload.htm !== method.toUpperCase()) return false
    if (payload.htu !== pathname) return false

    // Reject if this jti has already been used — prevents replay attacks.
    if (!checkAndRecordJti(payload.jti)) return false

    // Import the session's bound public key and verify the JWT signature.
    // importKey with extractable=false prevents the key from being re-exported.
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      publicKeyJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    )

    // The verified data is the ASCII bytes of "header.payload" — identical to
    // the signing input used in buildDpopProof.
    // `await` is required: a bare `return promise` inside try/catch does not
    // route a rejection through the catch block, so a crypto error would escape
    // and crash the middleware instead of failing verification cleanly.
    return await crypto.subtle.verify(
      ECDSA_PARAMS,
      publicKey,
      base64urlDecodeToBytes(sigB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    )
  } catch {
    // Treat any parse or crypto error as a failed verification rather than
    // an unhandled exception that could interrupt the middleware chain.
    return false
  }
}
