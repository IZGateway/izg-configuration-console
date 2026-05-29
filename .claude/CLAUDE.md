# izg-configuration-console — Project Instructions

Next.js configuration console for IZ Gateway. AWS ECS (Fargate) + Docker.

**Public repo** — follow IZ Gateway Public Repo Policy (in global CLAUDE.md).

---

## Runtime Environment

- **Minimum Node.js: 24.x**
  - Base image: `ghcr.io/izgateway/alpine-node-openssl-fips:latest` (Alpine 3.23)
  - Alpine 3.23 ships nodejs at 24.x via `apk add nodejs`
  - Local dev: v22.22.2 (lower than prod — test against 24.x for production fidelity)
  - `globalThis.crypto` available natively — no polyfill needed

## Framework

- **Next.js 16 (Pages Router)** — uses `src/pages/`, not App Router
- **next-auth@4** — in maintenance mode; upgrade to v5 requires Pages→App Router migration (separate CR)

## Known CVE Remediation Notes

- **uuid (CVE GHSA-w5hq-g745-h8pq):** `next-auth@4` holds uuid at <14.0.0. Vulnerable functions not called by this app. Root fix: upgrade to next-auth@5 (separate CR).
- **@xmldom/xmldom:** `saml2-js` removed as dead dependency (2026-04-29). Root-level override to `^0.9.10` remains in package.json.
