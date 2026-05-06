# Spec: uuid Override — izg-configuration-console

## ADDED Requirements

### Requirement: npm override routes all uuid requires to @izgateway/uuid-cjs

`package.json` MUST contain an `"overrides"` block that redirects every transitive
`require('uuid')` call — including those inside `next-auth` — to the
`@izgateway/uuid-cjs` package at a version compatible with uuid@14.

```json
"overrides": {
  "uuid": "npm:@izgateway/uuid-cjs@^14.0.0"
}
```

The override MUST use the `npm:` protocol alias syntax so that npm resolves the
package by its published name without requiring a local path or a fork of next-auth.

#### Scenario: npm ls shows all uuid instances resolved to @izgateway/uuid-cjs

- **WHEN** `npm ls uuid` is run after `npm install`
- **THEN** every uuid entry in the dependency tree references `@izgateway/uuid-cjs`
  at version ≥ 14.0.0
- **AND** no entry references the vulnerable uuid@8.3.2 or any other uuid version

---

### Requirement: npm audit reports no findings for the uuid CVE

After applying the override and running `npm install`, the project MUST be free of
the uuid CVE finding GHSA-w5hq-g745-h8pq.

#### Scenario: npm audit is clean for the uuid CVE

- **WHEN** `npm audit` is run in `izg-configuration-console`
- **THEN** no finding referencing GHSA-w5hq-g745-h8pq is reported

---

### Requirement: next-auth authentication continues to function

Overriding uuid MUST NOT break next-auth v4 JWT signing. Login, logout, and token
refresh MUST continue to work correctly after the override is applied, because
`@izgateway/uuid-cjs` exports a CJS-compatible `v4()` function that next-auth calls
internally.

#### Scenario: Login succeeds after override

- **WHEN** a user attempts to log in via next-auth
- **THEN** the login succeeds and a session is established without a runtime error

#### Scenario: Token refresh succeeds after override

- **WHEN** next-auth refreshes a JWT token
- **THEN** the refresh completes without an `ERR_REQUIRE_ESM` or other runtime error
