---
schema_version: '1.0'
created:
  date: '2026-07-24T02:11:09.074Z'
  user: boonek
  agent:
    name: GitHub Copilot CLI
    version: 1.0.73
  llm:
    name: claude-sonnet-4.6
    version: '4.6'
  prompt_uri: >-
    prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~71e447a3-8083-4798-ae9a-1acbbb865c2c
  summary: >-
    Create proposal for API key management (IGDD-3106) with domain
    authorization, credential lifecycle, and org schema migration
updated:
  - date: '2026-07-24T04:05:46.867Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~5adc769f-9c9c-4632-b77f-15924415ab72
    summary: Add primary sender user story to proposal Why section
  - date: '2026-07-24T04:03:09.260Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~fc55b626-c587-4945-9dd7-15a4f1ed3bb3
    summary: Add user story to jurisdiction-policy capability in proposal
  - date: '2026-07-24T03:41:20.947Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~5a117b29-ce82-48bf-964a-511cefd0dbae
    summary: Add jurisdiction-policy as third capability
  - date: '2026-07-24T02:36:23.917Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~cac499e6-3866-427c-a78e-0bd20cfd1dff
    summary: >-
      Fix Impact section: Jurisdiction gets allowedUseTypes, Sender gets
      useTypes+lastActive
  - date: '2026-07-24T02:36:04.026Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~cac499e6-3866-427c-a78e-0bd20cfd1dff
    summary: >-
      Update proposal: Jurisdiction gets allowedUseTypes (opt-in policy); Sender
      gets useTypes and lastActive
  - date: '2026-07-24T02:27:10.924Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~7e55d31a-d71f-41bd-abc7-f31a167baa40
    summary: >-
      Revise proposal: no migration, Jurisdiction field extensions, useTypes on
      ApiKeyCredential, drop organization-schema-migration capability
---
## Why

> *As a sender, I need to be able to validate my authority to obtain a credential, and
> to manage my credentials used to send data to IZ Gateway destinations. Manage in this
> context means create new credentials, and renew or revoke existing credentials. When I
> renew a credential, I need a grace period in which both the old and new credential still
> operate so that I can deploy the renewed credential to one or more systems without
> disruption of connected systems. When I revoke a credential, I want to be sure that it
> cannot be used after revocation so that a compromised credential cannot be used to act
> on my behalf without my permission, so that I can ensure the safety and confidentiality
> of patient data accessible through the IZ Gateway environment. I must be able to maintain
> multiple credentials so that I can be sure that different systems that I manage are
> appropriately identified and authorized to access IZ Gateway endpoints on my behalf, so
> that I can ensure separation of concerns between both credentials and systems responsible
> for different sets of patient data.*

Senders connecting to IZ Gateway currently authenticate using mutual TLS certificates, which require manual provisioning and cannot be self-managed. There is no mechanism for a sender to independently obtain, renew, or revoke API credentials — all credential operations require Audacious Inquiry staff involvement. This blocks senders from maintaining their own security posture, particularly when credentials are compromised or when multiple systems need distinct identities. API key management delivers sender self-service credential control while preserving the separation of concerns required for multi-system deployments.

## What Changes

- Senders can verify their authority to request credentials by proving control of a registered DNS domain within a given environment (`ApiKeyDomain`).
- Senders can issue new API credentials tied to a verified domain (`ApiKeyCredential`).
- Senders can renew an existing credential; both the old and renewed credential remain valid during a configurable grace period so dependent systems can be updated without disruption.
- Senders can revoke a credential immediately; a revoked credential is rejected at the IZ Gateway boundary, preventing use by a compromised or decommissioned system.
- Senders can hold multiple active credentials simultaneously, each independently identified, so that distinct systems are separately authorized and can be individually managed.
- The `Jurisdiction` entity gains `allowedUseTypes` — the set of credential purposes the jurisdiction permits access to its IIS data. This is the jurisdiction's opt-in access policy: a jurisdiction with no `allowedUseTypes` set permits no API key access by default; one that sets all three is fully open. Policy changes are made by updating the jurisdiction record alone — no credential or sender records are affected.
- The `Sender` entity gains `useTypes` — the submitter categories the sender acts on behalf of (patients, providers, public health agencies) — and `lastActive`, recording when the sender last transmitted a message.
- `ApiKeyCredential` gains a `useTypes` field scoping the credential to one or more submitter categories, allowing separation of concerns between credentials used for different populations of patient data.

## Capabilities

### New Capabilities

- `domain-authorization`: Authorize a DNS domain to request credentials for a given sender and environment. Covers domain registration, challenge/response verification, and revocation of domain authorization.
- `credential-lifecycle`: Issue, renew (with grace period), view, and revoke `ApiKeyCredential` records for an authorized domain. Credentials are optionally scoped by `useTypes` to enforce separation of concerns between systems handling different submitter populations.
- `jurisdiction-policy`: Configure the `allowedUseTypes` policy on a Jurisdiction, controlling which categories of credential (`PATIENT`, `PROVIDER`, `PUBLIC_HEALTH`) the jurisdiction accepts. *User story: As a Jurisdiction manager, I want to be able to specify which uses are permitted to access my Jurisdiction, so that I can ensure that access conforms to my jurisdiction's policies.*

### Modified Capabilities

*(none — no existing specs)*

## Impact

**DynamoDB:**
- New entities: `ApiKeyDomain`, `ApiKeyCredential` (modeled in `doc/database-entities.md`). These entities have no production data; no migration is required.
- Modified entities: `Jurisdiction` gains `allowedUseTypes` (opt-in access policy). `Sender` gains `useTypes` and `lastActive`. All existing records remain valid without update — new fields are optional.

**API routes (`src/pages/api/`):**
- New routes for domain authorization workflow (register, verify, revoke domain).
- New routes for credential lifecycle (issue, renew, revoke, list credentials).

**Authorization:**
- New role checks for credential self-management scoped to the sender's own identity.
- Existing jurisdiction-scoped access checks on Destination-facing routes are unaffected.

**`izgw-hub`:**
- Must accept `ApiKeyCredential` JWTs for sender authentication in addition to mTLS.
- Must enforce grace period and revocation state at the authentication boundary.
- Must enforce `useTypes` scoping when validating credentials against a submission's submitter category.

**Security-sensitive:**
- Credential values are write-once and must be stored encrypted via `EncryptedRepository`.
- Revocation must be enforced at read time in `izgw-hub`, not just at issuance time in the console.
- Grace period windows are bounded; expired grace periods must not silently extend.
