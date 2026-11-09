---
schema_version: '1.0'
created:
  date: '2026-11-07T12:36:17.983Z'
  user: boonek
  agent:
    name: claude-code
    version: '1.0'
  llm:
    name: claude-sonnet-5
    version: '5'
  prompt_uri: >-
    prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~93237308-f6ca-45e4-ad4b-cc9a2a6d66f1
  summary: Write proposal.md for declare-api-key-endpoint-permissions (IGDD-3549)
updated:
  - date: '2026-11-07T12:42:17.077Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '5'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~9ee2d27d-fe21-4c10-a5f4-23999e7169e6
    summary: >-
      Move 'how' (async scope mechanism) out of proposal.md into design.md's
      territory, per user correction; Trim mechanism detail from Impact section
      too, consistent with proposal/design boundary
---
# Declare permissions on seven API key endpoints

## Why

Seven routes under `src/pages/api/apikeys/*` and `src/pages/api/apikeysaudit/*` use the
`{ inHandler: <ticket> }` escape hatch instead of declaring a capability at the top of the file.
The checks they run in-handler are correct — `requireApiKeyAccess`/`hasApiKeyPermission`
(`src/lib/security/apiKeyAuthz.ts`) already combine capability and jurisdiction reach in one
role-local decision, the same invariant `can()` enforces everywhere else — but who may create,
renew and revoke API keys cannot be audited by reading the route declarations, only by reading
seven handler bodies. API keys are the most sensitive thing the console manages; this is exactly
the area where "who is allowed to do this?" should be answerable by looking, not by reading code.

[IGDD-3545](https://izgateway.atlassian.net/browse/IGDD-3545) and
[IGDD-3548](https://izgateway.atlassian.net/browse/IGDD-3548) (`protect-connection-pages-and-endpoints`,
merged to `develop` in PR [#771](https://github.com/IZGateway/izg-configuration-console/pull/771))
proved the `capability` + `scope` declaration pattern for exactly this problem, and that review
surfaced the one real gap in porting it here: `scope` is synchronous
(`(req: NextApiRequest) => string | undefined`), but these seven routes resolve a jurisdiction id
to its prefix with an async DynamoDB read before the capability+reach decision. A synchronous
extractor cannot express that.

## What Changes

- **Close the one real gap in reusing the prior CR's pattern here.** These seven routes don't
  have their jurisdiction sitting on the request the way a destId-scoped route does — it's
  resolved via a lookup, not merely read. The declaration mechanism needs to support that so
  these routes can be declaratively auditable the same way, instead of staying `inHandler`.
- **Declare `capability` + `scope` on all seven routes**, closing their `in-handler` debt rows.
- **Fold the multi-environment check into the base capability.** Per Anusha's resolved comment on
  the ticket (2026-10-28): "all users who have access to API key are allowed to have access to
  multi-environment keys." The existing `!session.user.isAdmin` group-membership check in
  `apikeys/index.ts` and `apikeys/domains.ts` is removed outright, not replaced with a new flag —
  there is no separate multi-environment permission to express.
- **Narrow IZG Operations' `apikeys.*` to `false`**, per the same resolved decision (target matrix:
  IZG Security and Jurisdiction Security only).

## What Does Not Change (scoped deliberately out)

- **Jurisdiction Operations' `apikeys.*` flags, and creating the `Jurisdiction Security` role** —
  both belong to [IGDD-3500](https://izgateway.atlassian.net/browse/IGDD-3500), which owns that
  pairing as one unit (the role doesn't exist in `CcRole` yet; this change does not add it).
  IGDD-3500's own description claims "removing the five `apikeys` flags from
  `_JurisdictionOperationsAccess.ts`" as its own technical detail — doing it here too would be the
  same edit landing from two tickets.
- **`Sender Operations`**, which currently also holds `apikeys.*` — that role is being retired
  (per IGDD-3548's resolution), not narrowed capability-by-capability. Left untouched here.

## Impact

- **Modified capability:** `page-authorization`.
- **Affected code:** `src/lib/api/api-middleware-helper.ts` (the extension), the seven
  `apikeys`/`apikeysaudit` route files, `src/lib/security/apiKeyAuthz.ts` (removing now-redundant
  in-handler reach logic where the declarative path takes over), `_IZGOperationsAccess.ts`,
  `authzDebt.ts` (seven `in-handler` rows closed).
- **Affected roles:** IZG Operations loses `apikeys.*`. No other role's values change in this CR.
