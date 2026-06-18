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
- **nginx is provided by the base image** — not installed in this repo's Dockerfile.
  - Removed from the `apk add` line as of IGDD-3010; the base image ships nginx.
  - This Dockerfile only supplies nginx *config* (`COPY nginx.conf.template`, `mkdir -p /etc/nginx/conf.d`) and `EXPOSE 443`. nginx terminates TLS on :443 and proxies to the Next.js app on :3000.

## Framework

- **Next.js 16 (Pages Router)** — uses `src/pages/`, not App Router
- **next-auth@4** — in maintenance mode; upgrade to v5 requires Pages→App Router migration (separate CR)

## Known CVE Remediation Notes

- **uuid (CVE GHSA-w5hq-g745-h8pq):** `next-auth@4` holds uuid at <14.0.0. Vulnerable functions not called by this app. Root fix: upgrade to next-auth@5 (separate CR).
- **@xmldom/xmldom:** `saml2-js` removed as dead dependency (2026-04-29). Root-level override to `^0.9.10` remains in package.json.

## Known Deprecation Notes (IGDD-2804)

Goal: zero `npm warn deprecated` on a fresh `npm install`.

- **react-axe / ts-node-dev:** removed (unused devDeps). `@axe-core/react` is the in-use a11y checker (`src/pages/_app.tsx`).
- **inflight:** eliminated by removing all `glob@7` consumers (it was a `glob@7` dep).
- **glob (all transitive):** the glob maintainer deprecates *every* version below the latest — `glob@7`, `@10`, and `@11` are all flagged; only `@12`/`@13` are clean. Root override `glob: ^13.0.6` forces every consumer (jest 30, rimraf, test-exclude, swagger-jsdoc) onto glob@13. glob@13 supports Node 18/20/≥22 (works locally and on prod Node 24) and keeps the v9+ API the consumers use.
- **jest@30:** upgraded from 29 to drop the old glob@7/test-exclude chain. `ts-jest@29.4.11` is already jest-30 compatible (peer accepts `^29||^30`).
- **rimraf:** bumped to `^6.1.3` so its native `glob@^13` pairing matches the override (rather than forcing glob@13 under rimraf@5).
- **swagger-jsdoc:** override `^6.3.0` (its own glob is then forced to 13 by the glob override).
- **lodash.get / lodash.isequal:** override `@apidevtools/swagger-parser` → `^10.1.0`, which replaced `z-schema` with `ajv`, dropping both micro-packages.
- **git-raw-commits:** bumped `@commitlint/cli` + `@commitlint/config-conventional` 17 → `^20.5.3`. commitlint ≤19 pulls `git-raw-commits@2`/`@4` (both deprecated); v20 uses `git-raw-commits@^5` (clean) while still allowing Node ≥18. (v21 also works but requires Node ≥22.12.)
- **jest test suite — PRE-EXISTING failure (not caused by IGDD-2804):** running `npm test` fails every jsdom suite with `ERR_REQUIRE_ESM` because the `jsdom: ^28.1.0` override (added earlier by the automated security tooling) pulls `html-encoding-sniffer@6`, which does a CommonJS `require()` of the ESM-only `@exodus/bytes` — an upstream packaging bug. This same dependency chain (and the failure) already exists on `develop` with jest@29; the jest 29→30 bump here did not introduce it, and CI does not run the Jest step (it is commented out in `deploy.yml`). `transpilePackages` does **not** fix it (the bad `require()` happens at runtime inside untransformed node_modules, not in jest's transform path). Left as-is to keep deprecations clean and preserve the jsdom security bump; tracked for a separate follow-up. Workaround options if revived: revert jsdom to `@26` (CJS `whatwg-encoding`, but reintroduces that dev-only deprecation) or wait for an upstream html-encoding-sniffer fix.
- **@mui/base (CANNOT eliminate yet):** pulled transitively by `@mui/lab@5` and `@mui/x-date-pickers@6`. *Every* published `@mui/base` version is deprecated (renamed to `@base-ui-components/react`); there is no maintained version to override to. Removing it requires migrating the MUI stack off v5 (separate CR). This is the one expected residual deprecation warning.
