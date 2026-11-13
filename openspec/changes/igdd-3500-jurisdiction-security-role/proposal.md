## Why

The ratified role matrix ("Role Based Access Control for IZ Gateway", Confluence 1006043137,
version 14) creates a Jurisdiction Security role: the jurisdiction staff who obtain credentials,
such as API keys, for their sending and receiving systems ([IGDD-3500]). Issuing a credential is
more sensitive than managing an endpoint, so the matrix also takes API key management away from
Jurisdiction Operations, which holds it today.

The Okta group `Jurisdiction Security` already exists ([IGDD-3600]). Its dev test account signs
in with no role, because the Console does not map the group yet.

## What Changes

- Add `Jurisdiction Security` as a recognized role:
  - add it to `CcRole`, `ROLE_PRECEDENCE` (after the global roles, ahead of the other
    jurisdiction roles) and `GROUP_ROLE_MAPPING`;
  - add it to the `accesslevel` map and the access definitions index;
  - create `_JurisdictionSecurityAccess.ts` from the matrix's Jurisdiction Security column:
    `globalTenancy: false`, every flag written out by name. It holds everything Jurisdiction
    Operations holds except Admin Log Search (`console.canViewConsole`), plus the five `apikeys`
    flags and `edit.canApproveChangeRequest`.
- Narrow Jurisdiction Operations:
  - remove its five `apikeys` flags;
  - remove `edit.canApproveChangeRequest`, which the matrix grants to the Security roles only.
    No code reads this flag (`authzDebt.ts`), so removing it changes no behaviour; IGDD-3498
    removed it from IZG Operations the same way.
- Update the text that names Jurisdiction Operations as the API key holder: the Home page FAQ
  answer on requesting an API key, and comments in `menuItems.tsx`, `apiKeyAuthz.ts` and
  `_SenderOperationsAccess.ts`.
- Tests: the role matrix snapshot, `policy.test.ts`, `rolemapping.test.ts`, `menuItems.test.tsx`,
  and the API key route tests, which used Jurisdiction Operations as the jurisdiction role that
  holds API keys and now use Jurisdiction Security.

No route, gate or UI component changes: the role's access follows entirely from its access
definition.

## Not in this change

- **Sender Operations.** Its Okta group is retired ([IGDD-3600]), so the role grants nobody
  anything, but removing it from the code touches many tests and is left for its own ticket.
- **The RBAC Playwright check** (`e2e/rbac/`, [IGDD-3621]). Marking Jurisdiction Security live
  there, and removing the Jurisdiction Operations API key gaps, follows once this is deployed to
  dev. Until then the nightly run against dev is expected to show two things:
  - `apiKeyRbacScoping.spec.ts` fails, because it signs in as Jurisdiction Operations to manage
    API keys and now gets 403. It moves to a Jurisdiction Security account, which first needs a
    jurisdictions claim and at least one key.
  - The RBAC report shows the Jurisdiction Operations `apikeys.*` cells as GAP CLOSED. The
    report never blocks a deploy.

## Release precondition

Jurisdiction Operations users who create API keys today lose that ability when this ships. Before
release, whoever uses API key management in Jurisdiction Operations must be added to the
`Jurisdiction Security` Okta group. API key management is behind
`FEATURE_API_KEY_MANAGEMENT_ENABLED`; in an environment where it is off, nobody uses it today.

## Capabilities

### Modified Capabilities

- `multi-role-authorization`: the union scenario that used Jurisdiction Operations as the API key
  holder now uses Jurisdiction Security; a requirement records the new role and the narrowing.

## Impact

- `src/lib/security/rolemapping.ts`, `accesslevel.ts`, `accessdefinitions/index.ts`,
  `accessdefinitions/_JurisdictionSecurityAccess.ts` (new),
  `accessdefinitions/_JurisdictionOperationsAccess.ts`.
- `src/components/Home/Faqs.tsx` (one sentence), comments in `menuItems.tsx`, `apiKeyAuthz.ts`
  and `_SenderOperationsAccess.ts`.
- The tests listed above.

[IGDD-3500]: https://izgateway.atlassian.net/browse/IGDD-3500
[IGDD-3600]: https://izgateway.atlassian.net/browse/IGDD-3600
[IGDD-3621]: https://izgateway.atlassian.net/browse/IGDD-3621
