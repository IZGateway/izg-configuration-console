---
schema_version: '1.0'
created:
  date: '2026-08-13T13:20:47.964Z'
  user: boonek
  agent:
    name: GitHub Copilot CLI
    version: 1.0.79
  llm:
    name: claude-sonnet-4.6
    version: '4.6'
  prompt_uri: >-
    prompt:/claude-code/9edee8ca-3f1c-48f5-91cc-295c416b89e4/~e8f925b2-a3a7-4310-a5bb-c4d02c1eacc8
  summary: Initial proposal for api-key-data-migration CR (IGDD-3258)
updated:
  - date: '2026-08-13T14:24:58.623Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.79
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/claude-code/9edee8ca-3f1c-48f5-91cc-295c416b89e4/~e8f925b2-a3a7-4310-a5bb-c4d02c1eacc8
    summary: >-
      Correct data source access model: ops staff collect manually, script
      consumes as input files; Remove invented table names from Impact; keep
      description high-level; Add Reference section pointing to
      api-key-management OpenSpec artifacts; Add sync instructions for keeping
      api-key-management reference artifacts current
change_request: api-key-data-migration
ticket: IGDD-3258
---
## Why

Deployment of JWT API Token authentication (being delivered in a companion release) requires
that Jurisdiction and Sender entities exist in DynamoDB with accurate metadata and that the
access control tables correctly reflect which Senders are permitted to reach which Jurisdictions.
Neither dataset has been systematically populated or refreshed since initial setup, meaning a
manual entry-by-entry process would be required for every active organization before the new
functionality can go live. A one-time data migration script, executed against the database prior
to deployment, eliminates that manual burden and establishes a repeatable, auditable baseline.

## What Changes

- A data migration script is produced that can be run by operations staff against the DynamoDB
  database in any environment prior to deploying the JWT API Token release.
- The script sources Jurisdiction and Sender entity data from Salesforce and Elasticsearch to
  reflect currently active organizations and the use cases they have adopted.
- Sender identity records (the identifiers Senders currently use in messages) are collected and
  written alongside the Sender entities.
- The access control tables (Sender → Jurisdiction send-permission entries) are refreshed to
  reflect the current permission set, replacing stale initial-population data.
- The script and any supporting data files are committed to the `IGDD-3258_API_key_data_migration`
  branch but are **not** intended to merge into `develop`; the branch serves as the permanent
  record of the migration artifacts.

## Capabilities

### New Capabilities

- `data-migration/jurisdiction-entities`: Populate or update Jurisdiction entities in DynamoDB
  from Salesforce and Elasticsearch data, including use-case adoption flags and routing metadata
  for all Jurisdictions currently receiving messages via IZ Gateway.
- `data-migration/sender-entities`: Populate or update Sender entities in DynamoDB including the
  identities (MSH-3/MSH-4 values or equivalent) that each Sender currently uses when submitting
  messages, sourced from Elasticsearch message history.
- `data-migration/access-control`: Refresh the access control tables that govern which Senders
  are authorized to send messages to which Jurisdictions, replacing the initial population with
  current permissions derived from Salesforce onboarding records.

### Modified Capabilities

_(none — this change introduces new migration tooling and does not alter existing application
behavior or requirements)_

## Reference: API Key Management Design

The conceptual and physical design for the JWT API Token / API Key feature that this
migration supports is fully documented in the companion change request:

- **Location (this branch):** `openspec/changes/api-key-management/`
- **Source branch:** `IGDD-3140-api-key-management`
- **Jira ticket:** [IGDD-3140](https://izgateway.atlassian.net/browse/IGDD-3140)

Artifacts available for reference:
- `proposal.md` — why and what for the API key management feature
- `specs/credential-lifecycle/spec.md` — credential creation, rotation, revocation
- `specs/domain-authorization/spec.md` — authorization domain model
- `specs/jurisdiction-policy/spec.md` — jurisdiction-level policy requirements
- `design.md` — DynamoDB physical schema, JWT structure, access control model
- `tasks.md` — implementation task breakdown

**Downstream specs, design, and tasks for this migration change should consult
`openspec/changes/api-key-management/design.md` as the authoritative source for
DynamoDB table names, entity shapes, and access control data structures.**

### Keeping in Sync

The files in `openspec/changes/api-key-management/` are a point-in-time snapshot —
they are not automatically updated when `IGDD-3140-api-key-management` changes.
If the API key management design evolves materially, refresh the snapshot by running:

```bash
git fetch origin
git checkout origin/IGDD-3140-api-key-management -- openspec/changes/api-key-management/
git commit -m "chore: refresh api-key-management reference artifacts from IGDD-3140"
```

Before beginning specs or design work on this migration, confirm with the IGDD-3140
author that `design.md` is stable enough to use as a reference baseline.

## Impact

- **DynamoDB**: The migration script writes to the DynamoDB tables that support
  Jurisdiction entities, Sender entities, and access control permissions.
- **Data sources**: Input data is collected manually by operations staff from Salesforce
  (organization and use-case data) and Elasticsearch (message identity / routing history)
  and provided to the script as input files. The script itself does not connect to those
  systems directly.
- **Auth / jurisdiction scoping**: No changes to runtime authorization logic; this migration
  populates the data that the JWT API Token feature will rely on.
- **Deployment dependency**: The migration script must be executed successfully before the
  JWT API Token release is deployed to any environment.
- **No application code changes**: The migration is a standalone operational script; no
  changes to `src/` are required by this change.
- **Branch strategy**: Artifacts live on `IGDD-3258_API_key_data_migration` only; intentionally
  excluded from `develop` to avoid committing large data blobs to the main branch history.
