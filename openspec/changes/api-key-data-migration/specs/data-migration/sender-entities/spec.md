---
schema_version: '1.0'
created:
  date: '2026-08-13T14:36:58.595Z'
  user: boonek
  agent:
    name: GitHub Copilot CLI
    version: 1.0.79
  llm:
    name: claude-sonnet-4.6
    version: '4.6'
  prompt_uri: >-
    prompt:/claude-code/9edee8ca-3f1c-48f5-91cc-295c416b89e4/~e8f925b2-a3a7-4310-a5bb-c4d02c1eacc8
  summary: Sender entities spec for api-key-data-migration
updated:
  - date: '2026-08-19T19:15:38.440Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.80
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/6b36fcb8-6019-41de-8218-f2e836b132e7/~285bfc5d-46f2-4cba-92f5-1c8d8ab1090a
    summary: >-
      Add prefix requirement for Okta integration: human-readable mnemonic per
      sender, full prefix table, scenarios for Okta admin grant and absent
      prefix
  - date: '2026-08-14T02:48:12.072Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.79
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/claude-code/9edee8ca-3f1c-48f5-91cc-295c416b89e4/~d27b3e0a-7f0a-40de-8691-268ddfb7f2ad
    summary: >-
      Add Input Data section: sender CSV reference, VA consolidation rule,
      DOD/DOW note, MSH identity gap
change_request: api-key-data-migration
ticket: IGDD-3258
---
## Purpose

Specifies the required outcome of seeding Sender entity records in DynamoDB so that
each organization currently sending messages via IZ Gateway is represented with accurate
`useTypes` before the JWT API Token feature is enabled.

There are two categories of sender:

1. **Jurisdiction IIS senders** — public health IIS systems that participate in
   IIS-to-IIS data exchange. These are already Jurisdiction records in DynamoDB;
   the migration adds `useTypes: PUBLIC_HEALTH` to those records. Every jurisdiction
   with `IIS to IIS Data Exchange = true` in the input data is in this category.

2. **Non-jurisdiction senders** — commercial, federal, and consumer-access organizations
   (e.g., VHA, Mayo Clinic, Docket, eHealth Exchange) that are not public health IIS
   systems. These require new Jurisdiction table records with only `useTypes` set
   (no `allowedUseTypes`, no `prefix`).

## Input Data

**Jurisdiction IIS senders** are identified from the authoritative Salesforce report
(same source as jurisdiction-entities): every jurisdiction with `IIS to IIS Data
Exchange = true` SHALL have `useTypes: PUBLIC_HEALTH` added to its existing Jurisdiction
record. Sub-state entries flagged SKIP in `jurisdiction-allowed-use-types.csv` (Chicago,
Houston, San Antonio, LA County, Maricopa County) are excluded -- they use their parent
state's IIS infrastructure and do not have separate records.

**Non-jurisdiction senders** are derived from the **"List of Live Pro to IIS Data
Exchange"** column in the same export. The canonical sender list with `useTypes` is:

**`openspec/changes/api-key-data-migration/sender-organizations.csv`**

**Consolidation rules applied:**
- `Veterans Administration (VistA)`, `Veterans Administration (Oracle Health)`, and
  `Veterans Administration` are three Salesforce name variants for one organization
  (sender_id: `VHA`). They SHALL produce one Sender record.
- `Department of Defense (DOD)` and the historical name `Department of War (DOW)` refer
  to the same entity (sender_id: `DOD`) and SHALL produce one Sender record.

This yields **15 unique non-jurisdiction Sender records**:
- 10 x `PROVIDER` (VHA, RIISE, DOD, VAMS, Mayo Clinic, DaVita, Fresenius, AZOVA, DocStation, Fond du Lac)
- 1 x `PATIENT` (Docket)
- 1 x `PUBLIC_HEALTH` (eHealth Exchange, pilot scope)
- 3 x `PUBLIC_HEALTH|PROVIDER|PATIENT` (Security Risk Solutions, e-HealthSign, Audacious Inquiry operators)
**eHealth Exchange (pilot):** eHealth Exchange is a QHIN currently in onboarding-only
pilot. Its `useTypes` is `PUBLIC_HEALTH` only for this migration. It is permitted to
send only to Nevada. Full `useTypes` (`PUBLIC_HEALTH|PROVIDER|PATIENT`) is planned
post-pilot but is out of scope here.

Note: MSH-3/MSH-4 message header values are used by the Hub for inbound message routing
(mapping a message to a destination), not for access control. Access control is determined
entirely by TLS certificate identity (DNS common name). MSH identity data is therefore
not required for this migration.

## Certificate Identity and Environment Mapping

Sender DNS identities are derived from the **DigiCert issued certificate list**, which
is the definitive source for certificates permitted to connect to IZ Gateway. The
following rules govern how certificate common names map to environments and senders:

- A certificate whose common name contains `test` or `UAT` (case-insensitive) is
  permitted in the **onboarding** environment only.
- A certificate whose common name contains `prod` (case-insensitive) is permitted in
  the **production** environment only.
- A certificate matching `*.testing.izgateway.org` is permitted in **any** environment
  (production, onboarding, and all dev/test environments), with the exception of
  `cicd.testing.izgateway.org` which is on the production DenyList (onboarding only).
  These are issued to IZ Gateway operators and Tier 3 technical staff.
- The following certificates appear on a production **DenyList** and cannot access
  the production environment regardless of their common name pattern:
  `cicd.testing.izgateway.org`, `dev.izgateway.org`, `dev.xform.izgateway.org`,
  `preprod-cc.phiz-project.org`, `preprod.phiz-project.org`,
  `preprod.xform.phiz-project.org`, `test.izgateway.org`.
  These certs are onboarding-only.
- Certificates matching *.phiz-project.org are IZ Gateway's own certificates in the
  APHL environment and represent the Hub itself, NOT a sender or jurisdiction. These SHALL
  be excluded from AllowedUser record generation entirely.
- Certificates with names that do not match any of the above patterns require manual
  resolution by ops to determine the permitted environment.
- The certificate expiry date SHALL be used as the `validUntil` value on the
  corresponding AllowedUser records generated during the access-control migration.

**STChealth shared certificate — known limitation:** STChealth manages 17 jurisdictions
that share a single certificate for sending to IZ Gateway. This works under the current
X.509 mutual-TLS model (one cert, many destinations), but is incompatible with JWT API
Tokens (one certificate identity maps to one Sender record; routing to multiple
jurisdiction destinations from one cert is not supported). These 17 jurisdictions
cannot use JWT tokens until each obtains its own individual certificate. This
limitation is out of scope for this migration and is documented here for future
planning.

The 17 STChealth-managed jurisdictions are: Wyoming, Alaska, Maricopa County (AZ),
South Dakota, Michigan, Washington, West Virginia, Puerto Rico, Montana, Mississippi,
Tennessee, Ohio, Arizona, Louisiana, Indiana, District of Columbia, Virginia.

## ADDED Requirements

### Requirement: Non-jurisdiction senders are represented in the Jurisdiction table

Organizations that send messages via IZ Gateway but are not public health agencies
(e.g., commercial EHR vendors, federal agencies, health networks) SHALL each have a
record in the physical Jurisdiction table with `useTypes` set to reflect the use cases
they participate in.

Per the physical schema defined in `openspec/changes/api-key-management/design.md`,
Sender records are stored as Jurisdiction table entries; a record with `useTypes` acts
as a sender. A newly seeded sender SHALL be issued a unique ID that does not already
exist in the table (IDs are never reused across the shared namespace).

#### Scenario: New sender not yet in DynamoDB

- **WHEN** the migration runs and the input data contains a sender organization that
  has no existing record in DynamoDB
- **THEN** a new record SHALL be created in the Jurisdiction table with `useTypes`
  populated from the input data and a new unique ID assigned

#### Scenario: Sender already present in DynamoDB

- **WHEN** the migration runs and the input data contains a sender organization that
  already has a record in DynamoDB
- **THEN** the existing record SHALL be updated to reflect the `useTypes` from the
  input data
- **AND** the existing record's ID SHALL NOT change

### Requirement: Each sender record carries a human-readable prefix for Okta integration

The Configuration Console uses Okta for user authentication. When a user logs in, CC
fetches a `jurisdictions` array from the Okta userinfo endpoint and stores it in the
session as `session.user.jurisdictions`. This array contains the **lowercase `prefix`
values** of the Jurisdiction/Sender records the user is authorized to manage.

Okta group membership is configured by APHL's Okta administrators. The `prefix` value
on a Sender record is the human-readable token those administrators use to grant and
verify access — a mnemonic identifier they can inspect and reason about rather than an
opaque numeric ID. This is the same pattern used for IIS jurisdictions (e.g., `az`,
`md`, `nv`) and must be extended to sender organizations so that:

- CC users who manage sender API keys can be granted access via Okta group membership
- Okta administrators can verify correct configuration by reading group names
- Errors in Okta configuration (wrong sender granted access) are detectable by inspection

Each sender record written by this migration SHALL include a `prefix` field containing
a short, uppercase, mnemonic identifier unique across all Jurisdiction and Sender
records. The assigned prefixes are:

| sender_id | Organization | prefix |
|---|---|---|
| 100 | eHealth Exchange | `EHEX` |
| 101 | Docket | `DOCKET` |
| 102 | Security Risk Solutions | `SRS` |
| 103 | e-HealthSign | `EHEALTHSIGN` |
| 104 | Audacious Inquiry (operators) | `AINQ` |
| 105 | AZOVA | `AZOVA` |
| 106 | DaVita Physician Solutions | `DAVITA` |
| 107 | Department of Defense | `DOD` |
| 108 | DocStation | `DOCSTATION` |
| 109 | Fond du Lac | `FDL` |
| 110 | Fresenius Medical Care | `FRESENIUS` |
| 111 | Mayo Clinic | `MAYO` |
| 112 | RIISE | `RIISE` |
| 113 | VAMS | `VAMS` |
| 114 | Veterans Administration | `VHA` |

#### Scenario: Okta administrator grants a CC user access to a sender

- **WHEN** an Okta administrator adds a user to an Okta group associated with sender
  prefix `VHA`
- **THEN** CC's `session.user.jurisdictions` for that user SHALL include `vha`
  (lowercase of the prefix)
- **AND** CC SHALL permit that user to manage API keys for the Veterans Administration
  sender record

#### Scenario: Sender prefix is absent from a record

- **WHEN** a Sender record in DynamoDB has no `prefix` attribute
- **THEN** CC CANNOT associate Okta group membership with that sender
- **AND** users cannot be granted scoped access to that sender via Okta — they would
  require admin-level access instead


### Requirement: Migration is idempotent

The migration script SHALL be safe to run more than once against the same database
without producing duplicate sender records or corrupting existing data.

#### Scenario: Re-run with same input data

- **WHEN** the migration is run a second time with the same sender input data
- **THEN** no duplicate records SHALL be created
- **AND** the resulting DynamoDB state SHALL be identical to the state after the first run

### Requirement: Migration produces an execution report

Upon completion the migration SHALL emit a summary report identifying:
- the number of Sender records created
- the number of Sender records updated
- any senders in the input data that could not be written, and the reason

#### Scenario: Successful run

- **WHEN** the migration completes without write errors
- **THEN** the report SHALL list all created and updated sender records
- **AND** the exit status SHALL indicate success
