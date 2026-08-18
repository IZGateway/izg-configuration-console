---
schema_version: '1.0'
created:
  date: '2026-08-14T13:17:25.110Z'
  user: boonek
  agent:
    name: GitHub Copilot CLI
    version: 1.0.79
  llm:
    name: claude-sonnet-4.6
    version: '4.6'
  prompt_uri: >-
    prompt:/claude-code/9edee8ca-3f1c-48f5-91cc-295c416b89e4/~d27b3e0a-7f0a-40de-8691-268ddfb7f2ad
  summary: New spec for ApiKeyDomain seeding from certificate inventory
updated: []
change_request: api-key-data-migration
ticket: IGDD-3258
---
# Spec — Domain Authorization Seeding

## ADDED Requirements

### Requirement: ApiKeyDomain records are seeded for all active sender certificates

The data migration MUST create one `ApiKeyDomain` record per (environment, senderId,
domain) tuple derived from the `certificate-inventory.csv` for every cert whose
`sender_type` is `jurisdiction` or `sender` and whose `environment` is not `exclude`.

**Rationale:** Senders using X.509 mutual TLS certificates have already proven
domain ownership through the DigiCert certificate issuance process — a more rigorous
proof than the DNS TXT challenge the console otherwise requires. Seeding these records
as `authorized` allows the Hub's JWT credential flow to work immediately for existing
senders without requiring them to re-prove ownership of a domain they already control.

#### Scenario: Jurisdiction cert is seeded as an authorized ApiKeyDomain record

- **WHEN** a `certificate-inventory.csv` row has `sender_type = jurisdiction` and
  `environment` is not `exclude`
- **THEN** one `ApiKeyDomain` record is written for each applicable environment
  with the following attributes:
  - `entityType = ApiKeyDomain`
  - `sortKey = {envId}#{jurisdictionId}#{domain}` where `domain` = `common_name`
    and `jurisdictionId` is resolved from `jurisdiction_destid` via the
    `jurisdiction-table-current.csv` prefix lookup
  - `status = authorized`
  - `validatedAt` = migration run timestamp (cert issue date not tracked in inventory)
  - `authExpiresAt` = cert expiry date from `certificate-inventory.csv` `validUntil`
    column, if present; otherwise migration run timestamp + 1 year
  - `requestedBy = migration`

#### Scenario: Non-jurisdiction sender cert is seeded as an authorized ApiKeyDomain record

- **WHEN** a `certificate-inventory.csv` row has `sender_type = sender` and
  `environment` is not `exclude`
- **THEN** one `ApiKeyDomain` record is written for each applicable environment,
  following the same attribute rules as above, with `jurisdictionId` = `senderId`
  resolved from `sender-organizations.csv` by matching `salesforce_name_variants`
  to the cert `organization` field

#### Scenario: Ops and infrastructure certs are excluded

- **WHEN** a `certificate-inventory.csv` row has `sender_type = ops`
  OR `environment = exclude`
- **THEN** no `ApiKeyDomain` record is written for that cert

#### Scenario: Production deny-listed certs are excluded from production environment

- **WHEN** a cert common name appears on the production DenyList (7 entries listed in
  the `access-control` spec)
- **THEN** no `ApiKeyDomain` record is written for the production environment for
  that cert, even if its `environment` field would otherwise include production

### Requirement: STC Health shared certificates are handled as a known limitation

STC Health uses three certificates (`izgateway.stchealthops.com`,
`izgateway2.stchealthops.com`, `epicenter.stchome.com`) that are shared across
17 jurisdictions. Because `ApiKeyDomain` requires a 1:1 mapping from domain to
`senderId`, and these certs cannot be unambiguously attributed to a single
jurisdiction, the migration MUST NOT create `ApiKeyDomain` records for any STC
Health shared cert.

This is a known limitation: STC Health jurisdictions cannot use JWT API key
authentication until each obtains its own certificate. This limitation is already
documented in the `sender-entities` spec.

#### Scenario: STC shared certs produce no ApiKeyDomain records

- **WHEN** the cert `common_name` is one of `izgateway.stchealthops.com`,
  `izgateway2.stchealthops.com`, or `epicenter.stchome.com`
- **THEN** no `ApiKeyDomain` record is written; a warning entry is written to
  `migrate/unresolved.txt` identifying the cert and the STC limitation

### Requirement: ApiKeyDomain environment mapping follows cert inventory conventions

The `environment` field in `certificate-inventory.csv` uses these values:

| CSV value | Environments to seed |
|---|---|
| `production` | production only (envId = 1) |
| `onboarding` | onboarding only (envId = 3) |
| `any` | both production and onboarding (envId = 1 and 3) |
| `exclude` | no records — skip entirely |

#### Scenario: `any` cert produces records for both production and onboarding

- **WHEN** `environment = any`
- **THEN** two `ApiKeyDomain` records are written: one with `envId=1` (production)
  and one with `envId=3` (onboarding)

### Requirement: certificate-inventory.csv must include validUntil column

The `certificate-inventory.csv` input file MUST be updated to add a `validUntil`
column (ISO 8601 date, e.g. `2026-11-15`) containing the DigiCert expiry date for
each cert. This column is required so `authExpiresAt` is set accurately rather than
defaulting to migration timestamp + 1 year.

Certs whose `validUntil` is blank or absent SHALL use the default (migration timestamp
+ 1 year) and SHALL emit a warning in the unresolved report.

### Requirement: ApiKeyDomain seeding runs after Sender and Jurisdiction records are written

`ApiKeyDomain` batch generation depends on resolved `senderId`/`jurisdictionId` values.
The execution order defined in the `hub-safety` spec is extended:

1. Prefix corrections
2. Jurisdiction `allowedUseTypes` updates
3. Sender PutItem batches
4. IIS AllowedUser batches
5. Provider AllowedUser batches
6. **ApiKeyDomain batches** *(new — must run after Senders are written)*
