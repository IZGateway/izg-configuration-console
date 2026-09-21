# Manual Test Plan — Sender Operations Access

**Change under test:** a new `Sender Operations` role, scoped to a sender organization's own API
keys, with no access to any IIS-only page (Manage Connections, Test, Edit, Change Request,
History, Onboarding Senders).
**Companion:** `proposal.md`, `design.md`, `specs/` in this change folder.
**Depends on:** the multi-role support work (`session.user.roles`, per-role escalation guard)
already being live in this environment.

## How to use this plan

**One session per account.** Sign in once, run every check listed for that account, then sign out
and move to the next. Sessions are cached for **30 minutes** and switching accounts requires a
full sign-out (or a separate browser profile / private window).

**Order matters.** Session 1 confirms a sender alone gets exactly the access it should and nothing
more. **Session 2 is the release gate** — it's the one account that pairs a sender with a role that
has broad reach but no API-key rights, which is the specific combination that could leak access
neither role grants alone. Session 3 covers a lower-risk multi-role combination. Session 4 is a
quick regression check that the four pre-existing roles are unaffected. A final section covers
checks that aren't tied to any single account.

---

## 0. Setup

### 0.1 Okta test accounts

| #      | Account                            | Okta groups                                | Jurisdictions claim |
| ------ | ----------------------------------- | ------------------------------------------- | -------------------- |
| S1     | senderops@mail.com                  | `Sender Operations`                         | `ainq`               |
| **S2** | **izgsupport-sender@mail.com**      | **`IZG Support` + `Sender Operations`**     | `utph`               |
| S3     | jurisdictionops-sender@mail.com     | `Jurisdiction Operations` + `Sender Operations` | `ut,utph`        |
| R1     | any existing single-role account    | any one of the four pre-existing roles      | (its own, unchanged)  |

**S2 is the most important account in this plan.** It is the privilege-escalation case and cannot
be found by testing a sender account alone.

**S1 uses `ainq`** (Audacious Inquiry), a real sender organization already seeded in this
environment — no dependency on IGDD-3258 to run Session 1.

**S2 and S3 use `utph` deliberately, not as a placeholder.** It mirrors the same prefix-collision
scenario this codebase's comments and tests use `azova`/`az` for (`policy.ts`, `policy.test.ts`):
`ut` (Utah, a real IIS jurisdiction) is a literal prefix of `utph`, the sender-organization prefix
used for those two accounts. Every session below that involves this pair specifically exercises
that collision — S1/`ainq` does not, since it is not part of the collision pair.

**R1 doesn't need a dedicated new account.** This change adds two matrix flags
(`canViewConnections`, `onboarding.canViewOnboarding`), both set `true` for all four existing
roles — if you still have any account from the multi-role-permissions test plan (U1–U4), reuse one
of those.

### 0.2 Baseline capture

If you have baseline screenshots/notes from the multi-role-permissions test plan for the account
used as R1, reuse them. Otherwise, before deploying this change, record R1's nav items and home
page call-to-action so Session 4 has something to compare against.

### 0.3 Environment

- [ ] Deploy the branch to the test environment.
- [ ] Confirm an Okta group is mapped to `Sender Operations` in `GROUP_ROLE_MAPPING` and that S1/S2/S3
      are assigned to the right groups. **[CONFIRM the exact group name with the Okta administrator
      — see `design.md` Open Questions.]**
- [ ] Confirm the `utph` jurisdiction row exists in DynamoDB with a non-empty `prefix` (this is
      IGDD-3258's sender-seeding work — needed for Sessions 2 and 3 only; S1's `ainq` is already
      seeded). **If `utph` doesn't exist yet, every check below that expects to see `utph`
      credentials will instead show an empty list — that's the system failing closed correctly on
      missing data, not a bug in this change, but it will look like one if you don't know this
      dependency is still in progress.**
- [ ] Have CloudWatch / log access ready — the last section of this plan reads log output.

> **Sessions are cached for 30 minutes.** Between role changes in Okta, sign out fully (or use a
> private window). A stale JWT will show pre-change group membership and produce confusing
> results.

### 0.4 Prep credentials (do this once, while signed in as R1 or any IZG Operations account)

- [ ] A credential in jurisdiction **`ut`** (Utah) — used in Sessions 1, 2 and 3 as the concrete
      "not this sender's org" example. Any existing `ut` credential works.
- [ ] Note that Session 1 itself creates a credential in **`ainq`** (S1's own, already-seeded
      organization) — no separate prep needed for that one.
- [ ] Note that Session 2 itself creates the first **`utph`** credential (S2 holds `Sender
      Operations` too, so it can create its own org's first credential same as S1 does for
      `ainq`) — no separate prep needed, but it does require the `utph` jurisdiction row from 0.3
      to exist first.

---

## Session 1 — S1 (`senderops@mail.com`, `Sender Operations` only)

Scoped to its own organization, full lifecycle permissions, no IIS access at all.

- [ ] Nav shows **API Key Management only** — no Manage Connections, no Onboarding Senders, no
      Admin Operations, no Access Control, no Console.
- [ ] Home page shows an **API Key Management** call-to-action. The **Manage Connections**
      call-to-action is absent. No **OUR API** button.
- [ ] Navigate directly to `/manageconnections` by URL → redirected away; no connection data is
      shown at any point.
- [ ] Open API Key Management. Create a new credential for `ainq` → succeeds. Confirm it appears
      in the list.
- [ ] Renew, revoke, and cancel are all available and functional on that credential (test at least
      one to completion; the state-machine rules for each are covered by automated tests, this is
      confirming the buttons are reachable and wired up for this role).
- [ ] Using the `ut` credential from Setup: it does **not** appear in S1's credential list.
- [ ] Direct API calls against the `ut` credential (`sortKey`) — revoke, cancel, renew, create with
      that `jurisdictionId`, token reveal — all return **403**. _(Confirms tenancy scoping: `ut`
      must not match `ainq`. This is not the literal-prefix-collision case — that's covered by
      `ut`/`utph` in Sessions 2 and 3 — just a basic "different org" check.)_
- [ ] Check the `Session established` log line from this login: `roles` contains
      `Sender Operations`, and the jurisdiction is `ainq`.

---

## Session 2 — S2 (`izgsupport-sender@mail.com`) — 🚦 RELEASE GATE

**The single most important session in this plan.** S2 = `IZG Support` (global reach, *no*
API-key rights) + `Sender Operations` (full API-key rights, scoped to `utph`). The bug this
guards against: combining IZG Support's global reach with the sender role's API-key permission
would expose **every organization's and every jurisdiction's** credentials — access neither role
grants alone. It cannot be found by testing a sender account alone, which is why Session 1 is not
sufficient sign-off.

- [ ] Open API Key Management. Create a new credential for `utph` → succeeds. This is the first
      `utph` credential (S1 no longer creates one, since S1 is scoped to `ainq`).
- [ ] **List scoping.** The list contains **only** `utph` credentials.
      _(If the `ut` credential — or anything from any other organization or IIS jurisdiction —
      appears, STOP. This is the escalation. Fail the build.)_
- [ ] Using the `ut` credential's `sortKey`: revoke, cancel, renew, token reveal → all **403**.
- [ ] `POST /api/apikeys` to create a credential with the `ut` credential's `jurisdictionId` →
      **403**.
- [ ] **Manage Connections nav item IS visible**, and shows every IIS jurisdiction (global reach,
      same as a plain `IZG Support` account). This is expected and correct: `canViewConnections` is
      a "what"-only flag with no jurisdiction dimension, so unioning it across roles is safe —
      `IZG Support` genuinely holds this permission on its own, independent of the sender role. Do
      not confuse this with the apikeys case above, where reach must **not** leak between roles;
      this flag has no reach component to leak.

- [ ] Check the `Session established` log line: `roles` lists **both** held roles (`IZG Support`
      and `Sender Operations`).
- [ ] Revoke or renew a credential and confirm the resulting log line's `grantedBy` field says
      `Sender Operations` — not `IZG Support`, which has no apikeys permission to grant it.

If everything above passes, the core risk this change exists to prevent is verified.

---

## Session 3 — S3 (`jurisdictionops-sender@mail.com`)

`Jurisdiction Operations` (scoped to `ut`) + `Sender Operations` (scoped to `utph`) — two
different-tier scoped roles with non-overlapping reach. Confirms the union correctly grants both,
and that neither's reach expands into the other's.

- [ ] Nav shows both **Manage Connections** and **API Key Management**.
- [ ] Manage Connections shows `ut` (and only `ut` — not every IIS jurisdiction).
- [ ] API Key Management shows credentials from **both** `ut` and `utph`.
- [ ] Can act on a `ut` credential (full IIS lifecycle) and a `utph` credential (full apikeys
      lifecycle).
- [ ] Cannot act on a credential from a third jurisdiction (e.g. `md`, or any jurisdiction outside
      both `ut` and `utph`) → **403**.

---

## Session 4 — R1 (any pre-existing single-role account)

Quick regression: this change only added two flags defaulted `true` for all four existing roles.

- [ ] Nav is unchanged from the 0.2 baseline — Manage Connections and Onboarding Senders are still
      visible (if they were before).
- [ ] Home page call-to-action is unchanged.
- [ ] Manage Connections page loads normally — no unexpected redirect.

---

## Cross-cutting checks (not tied to one account)

### Okta group-ingestion resilience for the new group (needs an Okta admin)

If Okta config cannot be changed in the test tenant, mark this **N/A** and rely on the automated
`rolemapping.test.ts` cases, which cover all of these directly for `Sender Operations`.

- [ ] Rename the Okta group mapped to `Sender Operations` to a different case/separator (e.g.
      `sender-operations`, `SENDER_OPERATIONS`). The user retains the same access after re-login.
- [ ] Add a sender user to an unrelated Okta group as well (e.g. `Everyone`). Login succeeds,
      permissions unchanged, no error logged.

### Logging shape (verify once, from any session above)

- [ ] Every login produces exactly one `Session established` line containing the merged `groups`
      and the full `roles` array — confirmed above per-session, this just checks there's no
      duplication or a second, conflicting log line.

---

## Sign-off

| Covers                                  | Sessions | Result | Tester | Date | Notes |
| ---------------------------------------- | -------- | ------ | ------ | ---- | ----- |
| Sender-only access                       | 1        |        |        |      |       |
| **Escalation & tenancy (release gate)**  | **2**    |        |        |      |       |
| Multi-role combination                   | 3        |        |        |      |       |
| Existing-role regression                 | 4        |        |        |      |       |
| Okta group-ingestion resilience          | Cross-cutting |   |        |      |       |
| Logging shape                            | Cross-cutting |   |        |      |       |

**Release gate:** Session 2 must pass in full. Its **list scoping** check is the specific
regression a naive permission union would reintroduce, and it's invisible to testing a sender
account alone.
