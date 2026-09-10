---
schema_version: '1.0'
created:
  date: '2026-09-10T18:16:58.695Z'
  user: boonek
  agent:
    name: claude-code
    version: '1.0'
  llm:
    name: claude-sonnet-5
    version: '1.0'
  prompt_uri: >-
    prompt:/claude-code/4f96b5e4-3b73-481a-b286-a39b0bc937d1/~b232f255-4c58-48f6-8825-4241f7b4ee3f
  summary: >-
    Document Salesforce data sources and reconciliation process for updating
    denormalized batch CSVs
updated:
  - date: '2026-09-10T18:37:59.516Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '1.0'
    prompt_uri: >-
      prompt:/claude-code/4f96b5e4-3b73-481a-b286-a39b0bc937d1/~8cac21db-3250-45fd-b7b1-054a8cbb5937
    summary: >-
      Add Maryland md/md_c destid distinction to README, alongside the Virginia
      va/va_s note
tags:
  - salesforce
  - data-migration
  - denormalized-csv
ticket: IGDD-3258
document_type:
  - reference
---
# Updating the Denormalized Batch CSVs

This folder holds the reviewable, execution-ready CSVs that `batches/*.sh` read
directly to build DynamoDB batch writes. This README documents where the data
comes from and how to update it correctly the next time a Salesforce refresh
happens.

## Data sources (Salesforce)

| Data | Salesforce list view |
|---|---|
| IIS-to-IIS connections | https://izgatewayaudacious.lightning.force.com/lightning/o/IIS_to_IIS_Data_Exchange__c/list?filterName=All |
| Provider-to-IIS connections | https://izgatewayaudacious.lightning.force.com/lightning/o/Provider_IIS_Data_Exchange__c/list?filterName=All_Provider_IIS_Data_Exchange |

Pull the current list from each view before starting a reconciliation pass —
these are the authoritative source for "what connections should exist," not
anything cached in this repo.

## Important: the generator script is currently not usable for this

`generate-batches.js` reads six 3NF source CSVs
(`jurisdiction-table-current.csv`, `jurisdiction-allowed-use-types.csv`,
`sender-organizations.csv`, `certificate-inventory.csv`,
`iis-access-control-pairs.csv`, `provider-access-control-pairs.csv`) that were
deliberately deleted from the working tree on 2026-08-18 (commit `76ba69be`)
once the denormalized CSVs were considered "the reviewable artifacts." Nobody
updated the generator to stop needing them, so running it today fails
immediately (`ENOENT`) before it even reaches two further bugs found in PR
#643 review (a `migrationTs` use-before-declare ordering bug, and a missing
`prefix` column in the `senders.csv` writer).

**Practical consequence:** until someone restores those 6 files and fixes the
generator, updates to the denormalized CSVs in this folder are done by direct,
manual reconciliation against Salesforce — not by re-running the generator.
Everything below describes that manual process.

## File-by-file column conventions

| File | Sender key column | Receiver key column | Notes |
|---|---|---|---|
| `allowed-users-iis.csv` | `sender_prefix` (jurisdiction prefix, e.g. `ak`) | `receiver_destid` | IIS senders use a jurisdiction prefix, not a numeric ID |
| `allowed-users-provider.csv` | `sender_id` (integer) | `receiver_destid` | Providers use an assigned integer ID, not a prefix |
| `apikey-domains.csv` | `domain` → `entityId`/`entityName` | — | One row per cert domain across **all** sender types (IIS and provider); must stay env-consistent with every other file that references the same domain |

**Confirmed destination identifiers (do not assume these are the same across files):**

- In `allowed-users-iis.csv`, Virginia's receiver identity is `va_s` / `"Virginia (IIS)"` — **not** plain `"Virginia"`.
- In `allowed-users-provider.csv`, Virginia's receiver identity is `va` / `"Virginia"`.
- In `allowed-users-provider.csv`, Maryland's receiver identity is `md_c` / `"Maryland (Provider Connect)"` — **not** plain `"Maryland"`.
- In `allowed-users-iis.csv`, Maryland's receiver identity is `md` / `"Maryland"`.

These files use *different* destids for the same jurisdiction depending on
whether the connection is IIS-to-IIS or Provider-to-IIS. This is not a typo in
either file — confirm with the user before assuming one is wrong, and never
assume a destid from one file applies to another. Expect more of these; check
before assuming a jurisdiction's identifier is consistent across files.

## Reconciliation algorithm (used for the 2026-09 IIS-to-IIS and Provider-to-IIS updates)

1. Get the current pair list from the relevant Salesforce view above. Pairs
   are unordered (e.g. "Alaska / Washington" implies both directions should be
   checked, not just the direction listed).
2. For **every** pair, check **both directions** (A→B and B→A) in **both**
   environments (`production`, `onboarding`) against the existing
   `(sender_name, receiver_name)` tuples already in the target CSV.
3. For any direction that's missing, build the new row using **only** values
   already present in that same CSV — the sender's existing cert domain(s) (or
   ID) for that env, and the receiver's existing destid for that env. Never
   invent a cert domain, sender ID, or destid. If either side has zero
   existing rows in that env, stop and flag it — don't guess. (Two genuine
   gaps found this way in 2026-09: Virginia had no receiver rows under the
   name "Virginia" — it turned out to exist under `"Virginia (IIS)"`, a
   name-matching bug, not a data gap; and Virgin Islands U.S. had no
   onboarding-env sender cert at all, which *was* a real gap the user had to
   resolve directly.)
4. **Match names exactly, including suffixes like `" (IIS)"` or `" - Philadelphia"`.**
   Before concluding a jurisdiction has "no data," `grep` the raw file for it —
   a name mismatch looks identical to a missing row until you check.
5. A sender can have more than one active cert domain per environment (e.g.
   Alaska has two production certs). When adding a new receiver for that
   sender, add one row per existing cert domain, not just one.
6. After adding rows, **cross-check `apikey-domains.csv`** for every cert
   domain touched — the env tagged there must match the env used in
   `allowed-users-iis.csv` / `allowed-users-provider.csv`. The Optimoz
   incident (2026-09) is the cautionary example: `hco.optimoz.com` was
   mislabeled `production` in *both* `allowed-users-iis.csv` (17 rows) and
   `apikey-domains.csv` (1 row) when it was actually the onboarding cert —
   caught only because the user happened to know the real split. Don't assume
   existing env tags are correct just because they're already in the file.
7. Present the proposed additions (and any flagged gaps/inconsistencies) to
   the user for review **before** writing them to the CSV.

## Tooling note

For a large pair list, do the reconciliation in a small Python script (build
per-env indexes of existing pairs / sender certs / receiver destids from the
CSV, then check each requested pair in both directions) rather than by hand —
manual review of ~300+ pairs against ~1,600 existing rows is error-prone in
both directions (missing real gaps, and mis-flagging existing pairs as new
due to name mismatches, both happened in 2026-09 before the script caught them).
