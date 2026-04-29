# izg-configuration-console Copilot Instructions

## Runtime Environment

- **Minimum Node.js version: 24.x**
  - Base image: `ghcr.io/izgateway/alpine-node-openssl-fips:latest` (Alpine 3.23)
  - Alpine 3.23 ships `nodejs` at **24.x** via `apk add nodejs`
  - Developer local Node.js: v22.22.2 (lower than base image; test against 24.x for production fidelity)
  - `globalThis.crypto` is available natively — no polyfill needed for Node 20+ APIs

## Framework

- **Next.js 16 (Pages Router)** — the app uses `src/pages/`, not App Router
- **next-auth@4** — in maintenance mode; upgrade to v5 requires Pages→App Router migration (separate CR)

## Known CVE Remediation Notes

- **uuid (CVE GHSA-w5hq-g745-h8pq):** `next-auth@4` and `@cypress/request` hold uuid at <14.0.0.
  The vulnerable functions (`v3/v5/v6` with buffer args) are not called by this app or next-auth.
  Remediation options: patch-package on next-auth, or local CJS shim for uuid@14.
  Root fix: upgrade to next-auth@5 (separate CR).

- **@xmldom/xmldom:** `saml2-js` was removed as a dead dependency (2026-04-29) — resolved.
  Root-level override to `^0.9.10` remains in package.json for any future re-introduction.
