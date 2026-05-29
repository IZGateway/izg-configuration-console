/**
 * IndexedDB helpers for storing and retrieving the DPoP session key pair.
 *
 * IndexedDB is used rather than localStorage or sessionStorage because it is
 * the only browser storage mechanism that can hold live CryptoKey objects.
 * The private key is stored by reference — the key material itself stays
 * inside the browser's cryptographic subsystem and cannot be read out by
 * JavaScript (extractable=false).
 *
 * MDN — IndexedDB API:
 *   https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 * MDN — CryptoKey (non-extractable keys):
 *   https://developer.mozilla.org/en-US/docs/Web/API/CryptoKey
 */

const DB_NAME = 'izg-session'
const DB_VERSION = 1
const STORE_NAME = 'keys'
const PRIVATE_KEY = 'dpop-private'
const PUBLIC_KEY_JWK = 'dpop-public-jwk'

/** Opens (or creates) the IndexedDB database, creating the object store if needed. */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Writes a single value into the key store under the given key. */
async function dbPut(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(value, key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/** Reads a single value from the key store, returning null if absent. */
async function dbGet<T>(key: string): Promise<T | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Persists a DPoP key pair to IndexedDB after generation.
 *
 * Both the private key (as a non-exportable CryptoKey reference) and the
 * public key JWK (as a plain JSON object) are stored so that the same pair
 * can be reused across page reloads without regenerating and re-binding.
 *
 * @param privateKey    Non-exportable ECDSA P-256 CryptoKey — stored by
 *                      reference; key material never leaves the crypto subsystem.
 * @param publicKeyJwk  Exported public key in JWK format — sent to the server
 *                      via bind-session and stored in the session JWT.
 */
export async function storeKeyPair(
  privateKey: CryptoKey,
  publicKeyJwk: JsonWebKey
): Promise<void> {
  await dbPut(PRIVATE_KEY, privateKey)
  await dbPut(PUBLIC_KEY_JWK, publicKeyJwk)
}

/**
 * Loads an existing DPoP key pair from IndexedDB.
 *
 * Returns null if either key is missing, which signals _app.tsx to generate
 * a fresh pair. Both keys must be present to be usable — a partial record
 * (e.g. from an interrupted write) is treated as absent.
 *
 * @returns The key pair, or null if not found.
 */
export async function loadKeyPair(): Promise<{
  privateKey: CryptoKey
  publicKeyJwk: JsonWebKey
} | null> {
  const [privateKey, publicKeyJwk] = await Promise.all([
    dbGet<CryptoKey>(PRIVATE_KEY),
    dbGet<JsonWebKey>(PUBLIC_KEY_JWK),
  ])
  if (!privateKey || !publicKeyJwk) return null
  return { privateKey, publicKeyJwk }
}

/**
 * Deletes both keys from IndexedDB in a single atomic transaction.
 *
 * Called when the Auth component unmounts (tab close, logout, error recovery).
 * Using a single transaction ensures both keys are removed together — there
 * is no window where one key exists without the other after this returns.
 */
export async function clearSessionKeys(): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(PRIVATE_KEY)
    tx.objectStore(STORE_NAME).delete(PUBLIC_KEY_JWK)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}
