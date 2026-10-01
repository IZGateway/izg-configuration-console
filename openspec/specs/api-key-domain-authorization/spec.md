# api-key-domain-authorization Specification

## Purpose

Establish that an organization controls a domain before any API-key credential may be
issued for it. Ownership is proven by publishing a DNS TXT record at the domain apex,
which reproduces the DigiCert validation procedure jurisdiction IT teams already follow
for certificate issuance, so no retraining is needed. Publishing a DNS record is often a
multi-day ticketed process, and matching the familiar procedure keeps that cost down.

A domain belongs to exactly one organization. This is a deliberate departure from the
mTLS certificate model, where several senders could share a domain.

This specification covers what the **Configuration Console** proves, records and refuses.
Credential issuance, renewal and revocation are specified in
`api-key-credential-lifecycle`.

> **Provenance.** Synthesized on 2026-09-30 from two archived changes:
> `2026-09-30-api-key-management` (capability `domain-authorization`) and
> `2026-09-30-api-key-management-ui` (capability `api-key-management`). Where the two
> disagreed, the later `api-key-management-ui` spec was preferred, because it was
> reconciled against shipped code. Scenarios asserting Hub behavior were dropped, since
> the Hub is a separate system.

## Requirements

### Requirement: Domain ownership is proven by a TXT record at the domain apex

Before a domain may serve as the basis for a credential, the submitting organization SHALL
prove ownership through a DNS TXT record challenge. The record SHALL be published at the
apex of the domain being validated, not under a `_izg-verify` or similar prefix.

#### Scenario: A challenge is issued on first submission

- **WHEN** a credential request names a domain with no existing `ApiKeyDomain` record for
  the given environment and jurisdiction
- **THEN** a challenge UUID SHALL be generated and stored on the `ApiKeyDomain` record
- **AND** the challenge SHALL expire seven days from the request
- **AND** the record's status SHALL be set to `pending_challenge`
- **AND** the response SHALL instruct the submitter to publish a TXT record at the domain
  itself, carrying the value `izg-challenge=<uuid>`

#### Scenario: Verification queries the apex, not a subdomain

- **WHEN** the DNS lookup runs
- **THEN** it SHALL query the domain itself
- **AND** it SHALL NOT query a `_izg-verify.` prefixed hostname

#### Scenario: A successful lookup grants authorization

- **WHEN** the resolver finds the expected `izg-challenge=<uuid>` value as a TXT record
  at the apex
- **THEN** the `ApiKeyDomain` record's status SHALL become `authorized`
- **AND** the validation timestamp SHALL be recorded
- **AND** the authorization SHALL be set to expire one year from that date

#### Scenario: A missing record and a wrong value are distinguished

- **WHEN** the resolver finds no TXT record at the apex
- **THEN** the response SHALL say the record was not found and that DNS may not have
  propagated yet
- **AND** where a TXT record exists but no value matches, the response SHALL say the
  value did not match and SHALL report what was expected
- **AND** in both cases the record's status SHALL remain `pending_challenge`

#### Scenario: Unrelated TXT records at the apex do not defeat verification

- **WHEN** the apex carries other TXT records, such as other providers' site-verification
  strings
- **THEN** verification SHALL succeed if any one of the returned values matches the
  expected challenge

#### Scenario: A pending challenge can be read again

- **WHEN** the challenge for a credential still awaiting validation is requested again
- **THEN** the TXT record name and value SHALL be returned, so a caller who dismissed the
  dialog without copying them need not abandon the request

#### Scenario: An expired challenge is refused

- **WHEN** verification is attempted for a challenge whose expiry has passed
- **THEN** the request SHALL be refused with a message directing the caller to start over

### Requirement: A challenge is reused while it remains active

Re-submitting a domain that already carries a live challenge SHALL reuse it rather than
mint a new one, so a caller who has already published a TXT record does not have to
publish a different one.

#### Scenario: Re-submission returns the existing challenge

- **WHEN** a domain is submitted again while it holds a non-expired `pending_challenge`
  record for the same environment and jurisdiction
- **THEN** the existing challenge UUID SHALL be returned
- **AND** no new challenge UUID SHALL be generated

### Requirement: A domain belongs to exactly one jurisdiction, globally

A domain SHALL NOT be authorized for more than one jurisdiction at a time, in any
environment. Ownership SHALL be held on a record keyed by the normalized domain alone, and
SHALL be claimed by a race-safe conditional write.

#### Scenario: The first jurisdiction to verify a domain owns it

- **WHEN** a jurisdiction's TXT challenge for a domain succeeds
- **THEN** the domain SHALL be claimed for that jurisdiction by a conditional write,
  before any `ApiKeyDomain` row is marked `authorized` and before any credential is
  activated

#### Scenario: A second jurisdiction cannot claim an owned domain

- **WHEN** a different jurisdiction's TXT challenge for the same domain also succeeds,
  because it too published a valid record
- **THEN** the claim SHALL be refused with `409`, even though the DNS check passed
- **AND** no `ApiKeyDomain` row SHALL be authorized and no credential activated for that
  request
- **AND** the refusal SHALL be logged with the requesting and owning jurisdictions

#### Scenario: Re-verifying your own domain is idempotent

- **WHEN** a jurisdiction that already owns a domain verifies it again, for instance to
  authorize a further environment
- **THEN** the claim SHALL succeed again for that same jurisdiction
- **AND** the newly pending environments SHALL be authorized

#### Scenario: A create request for an owned domain is refused early

- **WHEN** a credential is requested for a new domain already owned by a different
  jurisdiction
- **THEN** the request SHALL be refused with `409` immediately, with no credential created
  and no challenge issued, rather than failing only at verification time
- **AND** this early check SHALL be a read, not a claim, because a domain can only be
  reserved by actually proving ownership

> **The early check is advisory; the conditional write is the enforcement.** Refusing at
> create time saves a caller a pointless seven-day challenge, but only the conditional
> write at verification time is race-safe.

> **Known limitation — domains authorized before this rule have no owner record.** The
> ownership record is written during verification. Domains that completed verification
> before this rule existed carry none, so a second organization can still claim one,
> because the conditional write finds no owner to conflict with. No backfill exists.
> Recorded in `~/Downloads/izg-cc-openspec-archive.md`, section 5.

> **Corrected against the implementation.** The earlier `domain-authorization` spec
> described exclusivity as binding a domain to one sender "within the same environment".
> The implemented rule is global: one owner per domain across every environment.

### Requirement: Domain authorization expires after one year

An authorization SHALL expire one year from the date of DNS verification. After expiry the
domain SHALL remain visible so the organization can start a new challenge, but it SHALL
NOT be selectable as an already-authorized domain.

#### Scenario: An expired domain is still listed

- **WHEN** the authorized-domain list is requested
- **THEN** domains whose authorization has expired SHALL be included
- **AND** their expired state SHALL be communicated, so the interface can show that
  re-authorization is required

#### Scenario: An expired domain cannot be selected for a new credential

- **WHEN** a credential is requested against a selected domain whose authorization has
  expired
- **THEN** the request SHALL be rejected with an error saying the authorization has
  expired and must be renewed through a DNS challenge

#### Scenario: An expired authorization does not satisfy the fast path

- **WHEN** the already-authorized fast path evaluates a record whose authorization has
  expired
- **THEN** that record SHALL be treated as not authorized and SHALL fall through to
  requiring a valid challenge, even though its stored status is still `authorized`

### Requirement: Authorization is recorded per environment, and one challenge satisfies all pending environments

An `ApiKeyDomain` record SHALL be held per environment and jurisdiction, so the
authorized-domain list can be answered for one environment at a time. DNS ownership itself
is environment-independent, so a single successful lookup SHALL authorize every
environment still pending for that domain.

#### Scenario: The domain list is scoped to its environment and jurisdiction

- **WHEN** the authorized-domain list is requested for an environment and jurisdiction
- **THEN** only domains authorized under that same pair, with an unexpired authorization,
  SHALL be returned

#### Scenario: A domain authorized in one environment is not listed for another

- **WHEN** the list is requested for an environment in which a domain was never
  authorized
- **THEN** that domain SHALL NOT be returned, even where the same jurisdiction holds an
  authorization for it in a different environment

#### Scenario: One challenge authorizes every pending environment

- **WHEN** a credential spans several environments, some already authorized for the
  domain and others still pending
- **THEN** a single successful TXT lookup SHALL authorize every environment still
  pending, without a separate lookup for each

### Requirement: DNS verification bypass cannot run in production

The development-only bypass SHALL require an explicit opt-in flag, and SHALL be ignored in
production even when that flag is set.

#### Scenario: A real lookup runs by default

- **WHEN** verification is called without the bypass flag enabled
- **THEN** a real DNS TXT lookup SHALL be performed
- **AND** the deployment environment alone SHALL NOT enable the bypass

#### Scenario: The bypass needs explicit opt-in outside production

- **WHEN** the bypass flag is enabled and the deployment is not production
- **THEN** the real lookup MAY be skipped
- **AND** a warning SHALL be logged

#### Scenario: The bypass is ignored in production

- **WHEN** the bypass flag is enabled and the deployment is production
- **THEN** the flag SHALL be ignored and a real DNS TXT lookup SHALL be performed

#### Scenario: A bypassed activation stays distinguishable on the record

- **WHEN** a credential is activated through the bypass rather than a real lookup
- **THEN** the verification method SHALL be recorded on the credential
- **AND** it SHALL remain distinguishable from a genuinely verified activation long after
  the log line has aged out
