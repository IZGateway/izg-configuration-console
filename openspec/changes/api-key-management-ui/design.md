## Context

The API Key Management screen and its create/renew/view-token flows were already
implemented on this branch (`src/components/ApiKeyManagement/index.tsx`,
`src/pages/api/apikeys/*`, `src/lib/db/dynamo.ts`). This change began as four
gap-closers (Filters, revoke/cancel split, DNS bypass hardening, server-side
pagination) and grew, as implementation progressed and the IGDD-3140 design landed, to
cover the full credential/JWT model reconciliation, server-side authorization, use-type
policy, global domain exclusivity, and several product guardrails. The console and the
Hub (`izgw-hub`) share one DynamoDB table, so many decisions below are about matching
the Hub's read-time enforcement rather than the console acting alone — the Hub's own
OpenSpec update (izgw-hub PR #177) reconciles the same contract from its side.

## Goals / Non-Goals

**Goals:**
- Functional Filters (Environment, Status, Organization) — client-side interim.
- Distinct revoke vs. cancel operations.
- Dev-only DNS bypass that cannot run in production.
- Use Types captured, validated, and carried through renew; Create-form narrowed to a
  sender's registered use types.
- Expiry/`Expired`/`Grace Period`/`Revoked` semantics that match the Hub.
- **Server-side authorization**: role + jurisdiction-ownership enforcement on every
  API route, not just UI gating.
- **Credential/JWT model reconciled with IGDD-3140**: bare-`{jti}` re-key,
  `environments` List (+ admin multi-env), identity-only JWT, apex DNS challenge,
  global domain exclusivity.
- Duplicate-scope guardrail and an expired-key re-issue flow.

**Non-Goals (deferred / separate work):**
- Server-side pagination/filtering on `GET /api/apikeys` — evaluated and decided
  against for current scale; see D8.
- `useTypes` as a grid column; the Audit Log tab.
- Server-side enforcement that `credential.useTypes ⊆ sender.useTypes` (deliberately
  held so the real break-point stays visible until sender data is seeded).
- Removing the JWT `roles` claim (pending Hub confirmation it isn't read).
- US-federal-holiday awareness in the grace business-day calculation.
- **Hub-side** enforcement of the `useTypes ∩ allowedUseTypes` intersection and the
  new `izgw-core` SecurityFault — tracked as a separate izgw-hub ticket.
- Production data seeding (`Jurisdiction.allowedUseTypes` backfill, sender
  registration) — separate ops ticket.

## Decisions

### D1 — Cancel is a SOFT cancel (record retained), Revoke marks status Revoked  *(REVISED)*

**Original decision:** `cancel` hard-deletes the pending `ApiKeyCredential`.
**Revised decision (2026-07-28, product):** `cancel` performs a **soft cancel** — sets
`status: 'cancelled'` + `cancelledBy`/`cancelledAt` and **retains the record** for audit.
Valid only from `ready_for_validation`, enforced atomically by a DynamoDB
ConditionExpression (`cancelApiKeyCredential`, `DELETE /api/apikeys`). Cancelled rows are
**hidden from the default Keys view** and surfaced only when the Status filter is set to
`Cancelled`. `revoke` still sets `status: 'revoked'` + `revokedAt`, valid from
`active`/`grace_period` (+ legacy `grace`/`superseded` for backward compatibility).

**Rationale:** Cancellation is logged either way; retaining the record preserves a
developer/audit signal (and can defer building a separate credential-history page) at
negligible cost, while default-hiding keeps the list free of noise for vendors/staff who
manage many keys. The HTTP verb stays `DELETE` (it is still "the Cancel action"). The
confirmation dialog and success toast were later corrected to say "cancelled" rather
than "removed" — the earlier wording implied a hard delete that never matched this
decision.

### D2 — Dev DNS bypass gated by `NODE_ENV !== 'production'` AND an explicit flag

**Decision & implementation:** `DNS_VERIFY_BYPASS_ENABLED = NODE_ENV !== 'production' && ALLOW_DNS_VERIFY_BYPASS === 'true'`
in `verify-domain/index.ts`; default disabled, `logger.warn` emitted when active, flag
documented in `src/.env.template`. `NODE_ENV` alone is not a reliable production guard in
every deploy config, so the explicit opt-in is required.

### D3 — `useTypes` and `environments` both stored as DynamoDB Sets (SS / NS)
*(REVISED — coordinated with the Hub's model, `izgw-hub` branch `IGDD-3257`)*

**Decision:** persist `ApiKeyCredential.useTypes` as a deduped **DynamoDB String Set
(`SS`)** and `ApiKeyCredential.environments` as a deduped **DynamoDB Number Set (`NS`)**.
Both attributes use a native DynamoDB Set rather than a List for the same reason: a Set
enforces uniqueness at the storage layer, so a bug upstream can't silently persist
duplicate use-types or environment ids the way a List would silently accept them. This is
a coordinated, cross-service change — the Hub's own `ApiKeyCredential.java` model moves
`environments` from `List<Integer>` to `Set<Integer>` in lockstep (izgw-hub, IGDD-3257),
matching its pre-existing `Set<String> useTypes` field. **Both sides must ship together**:
a console write of an `NS` against a Hub still expecting `List<Integer>` (or vice versa)
will fail the Hub's Enhanced Client deserialization on every read of that row.

In the SDK v3 `DynamoDBDocumentClient`, persisting either Set means passing a native JS
`Set` (`new Set(params.useTypes)` / `new Set(params.environments)`) — the marshaller emits
`SS`/`NS` directly from the element type; there is no `docClient.createSet` in v3 (that's
an AWS SDK v2 DocumentClient method and does not exist on this client — an earlier autofix
attempt called it and crashed every `POST /api/apikeys` with `TypeError:
dynamodDbDocClient.createSet is not a function` before this fix). On read, both attributes
are unmarshalled via `Array.from(item.X as Iterable<...>, ...)`, which handles a native
`Set` or a legacy `Array` alike (tolerating any interim rows written as a List during this
branch's development); `useTypes` values are further validated via `filter(isValidUseType)`
and `environments` elements are coerced via `Number` (defends against any interim rows with
string elements). Neither attribute is a JWT claim — both are server-side properties the
Hub reads by `jti` at routing time. Both Sets are safe because callers guarantee non-empty:
`useTypes` is required non-empty at create (§5.3), and `environments` is guarded the same
way — `POST /api/apikeys` already rejects empty `environments`, and `/renew` 409s rather
than passing an existing credential's empty `environments` through (an empty Set is not a
legal DynamoDB value).

> **History:** this branch originally persisted both `useTypes` and `environments` as a
> deduped List with string elements. IGDD-3140 made `useTypes` canonically `SS`. A
> subsequent pass generalized that to `environments` too, but with the wrong element type
> (string, not Integer) — a mismatch against the Hub's `List<Integer>` model at the time,
> caught and corrected to a plain `List<Integer>`-matching List of Number. That, in turn,
> was superseded by this revision once the decision was made to move `environments` to a
> Number Set outright (matching `useTypes`'s Set-based uniqueness guarantee), coordinated
> with an equivalent change on the Hub side.

> **Caveat — `Jurisdiction.allowedUseTypes` is not covered by the `useTypes` SS decision.**
> IGDD-3140's `SS` decision is about the *credential*-level `useTypes` attribute above. A
> jurisdiction's `allowedUseTypes` must be able to be **empty** (empty = the DENY-ALL policy
> state), and a DynamoDB String Set cannot be empty, so that attribute cannot use `SS` as-is.
> Storage for the jurisdiction-side attribute needs to stay a List (or represent deny-all by
> attribute absence, which is how the console's read path already treats it); resolve this
> with the IGDD-3140 owner before migrating anything beyond `useTypes`.

### D4 — Expiry (and JWT `iat`) are stamped at issuance, not at record creation

**Decision:** a `ready_for_validation` row carries **no expiry**; `verify-domain` stamps
`issuedAt` + `expiresAt = now + 1yr` when it flips the credential to `active`. The
existing-authorized-domain and renewal paths issue at create time, so they stamp then.
`token.ts` uses `issuedAt ?? createdOn` for the JWT `iat`, so the disclosed validity is
exactly one year from issuance. Renewal expiry: within 30 days of the old expiry →
`oldExpiry + 1yr`; otherwise `now + 1yr`. Expired-key re-issue (D12) always uses
`now + 1yr` — it does not inherit the old key's expiry lineage.

### D5 — `Expired` / grace-ended `Revoked` are derived in the UI; the Hub owns authoritative status

**Decision:** the console derives display status from the stored dates rather than waiting
on the Hub sweeper. Effective grace end = `min(graceExpiresAt, exp)` (a token cannot outlive
its `exp`). Precedence: stored `revoked`/`cancelled` win (`expired` is derived-only, never
stored); then for a renewed key
`Grace Period` while `now < min(graceEnd, exp)`, else `Expired` if `exp <= graceEnd` else
`Revoked`; then a non-renewed key past `exp` → `Expired`. The **Hub's**
`GracePeriodRevocationScheduler` persists the authoritative status (and currently marks all
grace-swept keys `revoked` — the Expired-vs-Revoked split is a separate Hub story, confirmed
still the case in the Hub's IGDD-3140 OpenSpec reconciliation).

### D6 — Match the Hub's DynamoDB contract exactly

**Decision:** the console and Hub share the table, so the grace status value is
**`grace_period`** (Hub `isUsableStatus` + sweep both key on it; the interim `grace` broke
both) and the successor attribute is **`supersededBy`** (the Hub model field; the interim
`supersededByJti` left the sweep's audit reference null). `active`/`grace_period` are the
only Hub-usable statuses. The DB method for this transition was originally named
`supersedApiKeyCredential` (missing the "e"); renamed to `supersedeApiKeyCredential` for
correctness across the interface, implementation, factory, tests, and the renew route.

### D7 — Server-side authorization: role AND jurisdiction-ownership on every route *(RESOLVED — was deferred)*

**Decision:** `src/lib/security/apiKeyAuthz.ts` provides `hasApiKeyPermission` (mirrors
`useRoleAccess()` server-side; unmapped roles deny-by-default) and
`ownsJurisdiction`/`requireApiKeyAccess` (wraps the existing `hasAccessToDestId`; IZG
Operations is global, Jurisdiction roles are scoped to `session.user.jurisdictions`).
Applied as a two-layer gate (role, then tenancy) to **every** `/api/apikeys/*` route:
list (result filtered to owned jurisdictions, closing an enumeration gap), create,
revoke, cancel, renew (ownership checked on the *old* credential; the new record
inherits its jurisdiction server-side), token reveal (gated on `canCreateApiKey` — it
hands out a live bearer credential, so it's gated as a mint operation, not a read),
verify-domain, and domain lookup. Ownership is checked **before** the status check on
mutations, so a non-owner learns nothing about a credential's state. UI gating
(`useRoleAccess()`) is retained but is no longer the only boundary — it was never a
security boundary on its own. The `/apikeys` nav item's visibility was also switched
from the coarse `isAdmin` flag to the actual `canListApiKeys` permission, since
Jurisdiction Operations has full server-side access but couldn't previously find the
page in the nav.

### D8 — Server-side pagination: decided against; fixed the real underlying issues instead

**Decision:** evaluated whether `GET /api/apikeys` needs offset/cursor pagination and
decided **against** it for current scale — the organization/sender count is bounded
(tens, not thousands), and the list is already ownership-scoped per D7. Building
generic pagination now would be effort against a scale not yet reached. Instead, fixed
the two things that actually mattered:
1. **`fetchApiKeyCredentials` now follows `LastEvaluatedKey`** in a loop — the prior
   single `Query` silently truncated past DynamoDB's 1MB page limit, which matters
   because soft-cancelled/revoked/expired rows are retained for audit and accumulate
   over time.
2. **Jurisdiction lookups are deduped** — the prior `Promise.all(items.map(...
   getJurisdiction))` fired one DynamoDB read per credential even for credentials
   sharing a jurisdiction (the in-memory cache doesn't help across concurrent misses).
   Now the distinct jurisdiction IDs are resolved once, up front.

If active-key volume genuinely grows into the thousands under one view, true cursor
pagination can be layered on top of the `LastEvaluatedKey` work already in place.

### D9 — Credential re-key to bare `{jti}`; `environments` Number Set; JWT reduced toward identity-only

**Decision:** per the IGDD-3140 design (and reconciled with the Hub's own OpenSpec
update), the credential sort key changed from `{env}#{jti}` to bare **`{jti}`** — the
Hub reads a credential directly by `jti` at routing time, with no environment prefix to
parse. The singular `env` (string) attribute is replaced by **`environments`** (a
deduped DynamoDB Number Set — see D3), so a credential can span multiple environments;
standard sender credentials still carry exactly one. Creating a multi-environment
credential is an **IZG Operations-only** capability, enforced server-side in
`POST /api/apikeys` (not just
hidden in the UI) — a non-admin request for more than one environment is rejected
(403) even if the caller otherwise has create permission. The JWT payload had its
numeric `env` claim removed entirely (environment authorization is now a server-side
property the Hub reads by `jti`); the `roles` claim is retained for this change,
pending confirmation that nothing in izgw-hub/izgw-core reads it (if it does, that
authorization signal needs to move to the DB record first). Existing rows written
before this change are read via fallback (`item.environments ?? [item.env]`), so no
migration was required for the console's own reads; a Hub-side migration of any
pre-existing `{env}#{jti}`-keyed rows is a separate, not-yet-scoped concern if/when the
Hub starts reading exclusively by bare `jti`.

### D10 — DNS ownership proven at the domain apex, not a subdomain

**Decision:** the TXT-record challenge moved from a `_izg-verify.<domain>` subdomain to
the **domain apex itself** (`<domain>`), matching DigiCert's own domain-validation
convention. The challenge value format (`izg-challenge=<uuid>`) is unchanged — only the
record's placement moved. This is env-independent, so a single successful lookup
authorizes every environment a multi-environment credential still needs proof for.

### D11 — Global domain exclusivity via a race-safe conditional claim

**Decision:** a domain belongs to exactly **one** jurisdiction across **all**
environments (not per-environment, which the existing `ApiKeyDomain` keying couldn't
express on its own). Enforced via a separate lock entity, `ApiKeyDomainOwner`, keyed by
the normalized (lowercased) domain alone, claimed with a conditional
`PutCommand` — `attribute_not_exists(sortKey) OR jurisdictionId = :jurisdictionId` —
which succeeds if the domain is unclaimed or already owned by the *same* jurisdiction
(idempotent re-verification/renewal), and fails only when a genuinely different
jurisdiction already holds it.

Two enforcement points, deliberately asymmetric:
- **Authoritative claim** happens in `verify-domain`, immediately after a DNS TXT match
  succeeds and before any `ApiKeyDomain` row is marked `authorized` or any credential is
  activated. This is the only place a domain transitions to authorized, so it's the
  only place that must be airtight.
- **Early, non-authoritative check** at `POST /api/apikeys` create time
  (`dnsChoice: 'other'`): a **read-only** lookup (`getDomainOwner`) rejects the request
  up front (409) if the domain is already owned by a different jurisdiction, so a
  caller isn't sent through the entire DNS-challenge dance only to lose the race at
  verify time. This check deliberately never writes — writing here would let a domain
  be "reserved" merely by starting a create request, without ever proving DNS
  ownership. It also cannot replace the verify-time claim: two concurrent create
  requests could both pass the early check before either finishes verification: the
  authoritative conditional write is what actually resolves that race.
- The already-authorized **fast path** in `verify-domain` (an org re-verifying a domain
  it already owns, e.g. for a new environment) does **not** re-attempt the claim — no
  new ownership is being granted there, and re-claiming risked breaking any
  pre-existing data where the same domain might have been legitimately authorized
  under two jurisdictions *before* this feature shipped. That fast path also now checks
  `authExpiresAt` (see D14) so a stale authorization can't silently bypass DNS
  re-verification either.

### D12 — Duplicate-scope guardrail: warn, don't block

**Decision:** creating a key whose (environment + use types) exactly matches an
existing **active** credential for the same organization and domain shows a warning
steering the user to Renew, but still allows creation on a second click ("Create
Anyway"). A hard block was tried and reverted: a rare legitimate parallel key with
identical scope must stay possible, and the warning itself is the anti-sprawl nudge —
blocking would just be friction without adding real safety. This is a client-side
guardrail only (a direct API call bypasses it), consistent with other UI-side guards
in this feature (e.g., the use-type narrowing).

### D13 — Expired-key re-issue: a Renew-styled dialog, not a lifecycle transition

**Decision:** an expired key does not go through the renew *lifecycle transition*
(`active → grace_period`) — there is nothing to overlap with a dead key, and the Hub
already rejects an expired JWT on `exp` regardless of DB status, so flipping it to
`grace_period` would buy nothing. Instead, re-issue is presented with the same
familiar UX as Renew (prefilled, read-only fields) but issues a **brand-new**
credential: fresh `jti`, `now + 1yr` expiry (no continuity with the old key's expiry),
no grace overlap, and the old expired key is left completely untouched. If the
domain's own authorization (`authExpiresAt`) has also lapsed, the dialog routes through
the DNS challenge first; otherwise it issues immediately by reusing the existing
`dnsChoice: 'existing'` create path. Revoked/cancelled keys remain fully terminal — no
re-issue action — since renewing lineage forward from a revoked (often compromised)
key is a deliberate non-goal.

### D14 — `verify-domain`'s fast path must also honor `authExpiresAt`

**Decision:** the already-authorized fast path in `verify-domain` originally checked
only `status === 'authorized'`, not whether `authExpiresAt` had passed — meaning a
stale authorization could silently activate a credential without ever re-proving DNS
ownership. Fixed to require `status === 'authorized' && authExpiresAt > now`, matching
the check the create route's `'existing'`-domain path already performed. An expired
authorization now correctly falls through to "needs a pending challenge," and (since
authorizing a domain clears its challenge fields) surfaces a 404 prompting a fresh
create/challenge cycle rather than silently activating.

### D15 — Atomic status-conditioned writes on every credential mutation

**Decision:** `cancelApiKeyCredential` and `updateApiKeyCredentialStatus` were already
atomic (their `ConditionExpression` pins the expected current status). Two siblings
were not: `revokeApiKeyCredential` only checked the row existed, and
`supersedeApiKeyCredential` had no condition at all. Both now pin the write:
`supersedeApiKeyCredential` atomically requires `status = 'active'` (the only valid
precondition for a renewal, mirroring the route's own pre-check); `revokeApiKeyCredential`
takes the caller's own revocable-status list (`['active','grace_period','grace','superseded']`,
defined once in the route) and enforces it via `#status IN (...)`, rather than
duplicating that list inside the DB layer. Both routes catch the resulting
`ConditionalCheckFailedException` and surface the same error they already return for
the synchronous (non-race) case, so a lost race is not silently swallowed into a 500.
This closes a narrow but real gap: without this, a concurrent status change (e.g. a
race between revoke and renewal, or between two revoke calls) could let a write land
on a credential that no longer qualified by the time it was applied.

### D16 — Token "view exactly once" made atomic

**Decision:** `token.ts`'s `if (credential.viewedAt)` pre-check reads a value fetched
moments earlier — it cannot, by itself, prevent two concurrent requests from both
passing it before either has recorded a view. `markApiKeyCredentialViewed` now adds
`attribute_not_exists(viewedAt)` to its `ConditionExpression`, making the write itself
the actual enforcement. `token.ts` catches the resulting `ConditionalCheckFailedException`
and returns the same 410 it already returns for the pre-check case, so the two code
paths are indistinguishable to the caller — only the outcome (exactly one request ever
receives the token) changed.

### D17 — Local Organizations mock: added, then removed once real data was seeded

**Decision:** a hardcoded Organizations mock (`mockData.ts`, gated behind
`NEXT_PUBLIC_MOCK_ORGANIZATIONS`) was added temporarily to exercise the
create/renew/validate workflow without a live jurisdictions table or seeded senders.
Once local DynamoDB was seeded with real sender/jurisdiction rows (including a
dual-role row carrying both `useTypes` and `allowedUseTypes`), the mock was removed
entirely — `useOrganizations()` now always calls `/api/jurisdictions`. No trace of the
mock remains in `.env.template` or the component.

### D18 — `ApiKeyDomain.env` converted from string to number, matching `environments`

**Decision:** `ApiKeyDomain.env` (a separate, console-only table tracking DNS
domain authorization per `(env, jurisdiction, domain)` — **not** read by the
Hub, so no cross-service contract applies) was `env: string`, requiring an
explicit `String(...)` coercion at every write site and a `String(item.env)
=== String(envId)` comparison on read. Raised in PR review (matching D3's
`environments` field to the same underlying environment-id concept):
converted to `env: number` for consistency — `upsertApiKeyDomain`'s param
type, both write call sites (`POST /api/apikeys`'s DNS-challenge branch,
`verify-domain`'s authorization branch), and the `fetchAuthorizedApiKeyDomains`
read/filter path (now `Number(item.env) === envId`) all changed accordingly.
`GET /api/apikeys/domains` now parses and validates its `envId` query
parameter as a number (1–5, same range check as the create route) instead of
passing the raw query string through. Reads still defensively coerce via
`Number(item.env)` to tolerate any pre-existing rows written while this
attribute was a String.

## Risks / Trade-offs

- **[Mitigated, was a Risk] UI role-gating is not enforcement.** Resolved by D7 —
  every route now independently enforces role + ownership.
- **[Risk] Grace cutoff depends on the Hub sweeper being enabled.** With
  `apikey.grace-revocation.enabled=false`, an aged-out key stays Hub-usable until its JWT
  `exp`, while the console derives `Revoked`/`Expired` — a display-vs-reality divergence.
  Enabling the sweeper is a rollout prerequisite.
- **[Risk] Client-side filtering/paging** does not scale past small datasets —
  deliberately accepted per D8 rather than left as an open gap; revisit if active-key
  volume grows substantially.
- **[Risk] JWT still carries `roles`.** The Hub's own OpenSpec reconciliation confirms
  it currently maps token `roles` into the principal, so removing it from the console
  side without a coordinated Hub change would silently break that mapping.
- **[Risk] Use-type policy is unenforced end-to-end until two separate efforts land:**
  the Hub's routing-time intersection check (separate izgw-hub ticket) and production
  data seeding (separate ops ticket, `allowedUseTypes` on jurisdictions + registered
  senders). Until both land, an empty/unseeded `allowedUseTypes` should mean deny-all
  at the Hub, but nothing enforces that today.
- **[Risk] Pre-existing domain-authorization data predates the exclusivity lock.** Any
  `ApiKeyDomain` row marked `authorized` before D11 shipped has no corresponding
  `ApiKeyDomainOwner` lock — the first caller to touch that domain through the real
  flow post-deploy "wins" the lock, which could theoretically surprise a second
  jurisdiction with pre-existing (undetected) access to the same domain. Not
  retroactively backfilled; flagged as a migration-adjacent gap, same class as the
  `{jti}` re-key.

## Migration Plan

Shipped incrementally on this branch (lint + tsc + node-env tests green at each step;
61 apikey-specific tests as of the latest change). **Rollback:** revert the PR; there is
no destructive data migration — cancel retains records, grace/successor values are
forward-compatible with legacy `grace`/`superseded` still accepted on revoke, and reads
fall back to legacy `env`/`{env}#{jti}` shapes for pre-existing rows. The credential
re-key and the domain-exclusivity lock are both **prospective only** (new writes),
consistent with the rest of this migration plan — no backfill of existing rows was
performed as part of this change.

## Open Questions

Resolved since the last revision: server-side pagination (D8 — decided against),
server-side authorization + ownership scoping (D7 — done), per-jurisdiction Use Types
constraint (done client-side, Create form), multi-env credentials (D9 — done), apex-TXT
+ cross-jurisdiction domain exclusivity (D10/D11 — done), Revoked/expired → re-issue
(D13 — done, as re-issue rather than renew).

Still open, tracked as separate follow-ups:
- JWT `roles` claim removal, pending Hub confirmation (see Risks).
- Hub sweeper Expired-vs-Revoked split (Hub-side, not blocking this change).
- Hub-side `useTypes ∩ allowedUseTypes` routing-time enforcement + new `izgw-core`
  SecurityFault (separate izgw-hub ticket).
- Production data seeding for jurisdiction policy + sender registration (separate ops
  ticket; a seeding script is the required deliverable).
- Whether to backfill `ApiKeyDomainOwner` locks for pre-existing authorized domains
  (see Risks) and whether to migrate legacy `{env}#{jti}` rows once the Hub reads
  exclusively by bare `jti`.
