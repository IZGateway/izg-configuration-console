# Tasks: IZG-SEC-2026-001 — Session Replay Remediation (Code Mitigations)

Code-level mitigations only. Operational mitigations (WAF IP allowlist, Elasticsearch
Watcher) are tracked separately and have been applied outside this CR.

---

## Phase 3 — CC Token Store Fix

- [x] 3.1 Confirm `token.accessToken` is set but never read in CC codebase
      (grep confirmed: only occurrence is line 42 of `[...nextauth].ts`)
- [x] 3.2 Remove `token.accessToken = account.access_token` from
      `src/pages/api/auth/[...nextauth].ts`
- [ ] 3.3 Verify no Okta access token appears in NextAuth JWT cookie after fix:
      the session cookie is a JWE (A256GCM) and cannot be decoded client-side.
      Verify indirectly: confirm session works correctly end-to-end and that
      removing the one-line assignment produces no regression (grep confirms
      `token.accessToken` was set but never read elsewhere in CC).
- [ ] 3.4 Regression test: log in, navigate admin pages, confirm `isAdmin` and
      `jurisdictions` resolve correctly, log out cleanly

---

## Phase 4 — WebCrypto DPoP Session Binding (CC)

### 4a — Implementation

- [x] 4.1 Create `src/lib/dpop.ts` — `buildDpopProof` and `verifyDpopProof` using
      native `crypto.subtle` (no `jose` dependency)
- [x] 4.2 Create `src/lib/sessionKeys.ts` — IndexedDB helpers: `storeKeyPair`,
      `loadKeyPair`, `clearSessionKeys`
- [x] 4.3 Create `src/pages/api/auth/bind-session.ts` — endpoint that receives
      public key JWK, updates NextAuth JWT to include `boundPublicKey`, re-encodes
      and re-issues the session cookie
- [x] 4.4 Update `src/pages/_app.tsx` (`Auth` component):
      - On authenticated mount: load or generate ECDSA P-256 key pair, store in
        IndexedDB, POST public key to `/api/auth/bind-session`
      - Install `window.fetch` interceptor that attaches `x-dpop-proof` header
      - Cleanup resets ref guard and restores original `window.fetch`
- [x] 4.5 Update `src/middleware.ts`:
      - Wrap with `withAuth`; read `boundPublicKey` from `req.nextauth.token`
      - Verify `x-dpop-proof` header when `boundPublicKey` is present
      - Redirect to sign-in on missing or invalid proof
      - Exclude `/api/auth/**`, `/_next/**`, healthcheck paths
      - In-process jti deduplication with 60-second TTL

### 4b — Testing

- [x] 4.6 Integration test: log in, confirm authenticated page loads work end-to-end
      with the proof flow (check Network tab for `x-dpop-proof` header on requests)
- [ ] 4.7 Verify `boundPublicKey` is present in the session after `bind-session` completes:
      the session cookie is a JWE (A256GCM) and cannot be decoded client-side.
      Verify indirectly: confirm `bind-session` returns HTTP 200, middleware does not
      redirect API requests to sign-in (proof verification requires `boundPublicKey`
      to be present), and DPoP proofs on API calls succeed end-to-end.
- [ ] 4.8 Attack simulation: capture `storageState` after login, attempt replay in a
      fresh Playwright instance — confirm all requests are redirected to sign-in
- [x] 4.9 Strict Mode verification: confirm DPoP initializes correctly in development
      (React 18 Strict Mode double-mount — ref guard is reset in cleanup)
- [ ] 4.10 Deploy to dev; repeat attack simulation against dev environment
- [ ] 4.11 Update CVSS note in IGDD-2893 — WebCrypto binding eliminates attack for CC

### 4c — xform-ui Follow-on (separate CR)

- [ ] 4.12 Port CC implementation to `izg-transformation-ui` (same files, same pattern)
- [ ] 4.13 Integration and attack simulation tests in xform-ui
- [ ] 4.14 Deploy to dev; verify

---

## Phase 5 — Closeout

- [ ] 5.1 Confirm PR merged to `develop`
- [ ] 5.2 Archive this CR directory under `openspec/changes/archive/`
- [ ] 5.3 Update [IGDD-2893](https://izgateway.atlassian.net/browse/IGDD-2893) with
      final implementation summary and mark resolved
