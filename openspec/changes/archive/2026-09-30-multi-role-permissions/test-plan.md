# Manual Test Plan — Multi-Role Support (union-based permissions)

**Change under test:** `session.user.role` (single) → `session.user.roles` (union), group
ingestion hardening, `globalTenancy` as matrix data.
**Companion:** `proposal.md`, `design.md`, `specs/` in this change folder.

## How to use this plan

**One session per account.** Sign in once, run every check listed for that account, then sign out
and move to the next. Sessions are cached for **30 minutes** and switching accounts requires a
full sign-out (or a separate browser profile / private window), so running every check for an
account together means you only log in once per account instead of jumping back and forth.

**Order matters.** Sessions 1–4 confirm the four existing single-role accounts are unaffected —
this is your regression baseline. **Session 5 is the release gate**: it's the one account that
combines two roles in the specific way that could leak access neither role grants alone. Run it
right after the baseline, so a failure there stops you early instead of after working through the
whole plan. Sessions 6–8 cover other multi-role combinations that matter but carry less risk. A
final section covers checks that aren't tied to any single account (logging, Okta group-ingestion
edge cases, session lifecycle).

---

## 0. Setup

### 0.1 Okta test accounts

Create or identify accounts for each row. Groups are assigned in Okta; CC reads them at login.

| #      | Account                                      | Okta groups                                        | Jurisdictions claim    |
| ------ | -------------------------------------------- | -------------------------------------------------- | ---------------------- |
| U1     | self admin account                           | `IZG Operations`                                   | any (ignored — global) |
| U2     | izgsupport@mail.com                          | `IZG Support`                                      | any (ignored — global) |
| U3     | jurisdictionops@mail.com                     | `Jurisdiction Operations`                          | `ak,al,at_draft,ainq`  |
| U4     | jurisdictionsupport@mail.com                 | `Jurisdiction Support`                             | `ak,al,az,at_draft`    |
| **U5** | **izgsupport-jurisdictionops@mail.com**      | **`IZG Support` + `Jurisdiction Operations`**      | `utph,ak`              |
| U6     | jurisdictionsupport-jurisdictionops@mail.com | `Jurisdiction Support` + `Jurisdiction Operations` | `ak,utph,ut`           |
| U7     | unmapped@mail.com                            | `CDC Program` only                                 | `ak,al`                |
| U8     | izgoperations-jurisdictionsupport@mail.com   | `IZG Operations` + `Jurisdiction Support`          | `ainq,ak,utph`         |

**U5 is the most important account in this plan.** It is the privilege-escalation case and
cannot be found by testing any single role.

**No "no CC group at all" account is listed.** Okta itself denies login for a user with no group
assigned to this app, so there is no session to reach that case manually — it's already covered by
an automated test (`policy.test.ts`'s deny-by-default cases: no roles, and a scoped role with no
jurisdictions).

> **On jurisdictions below.** Checks refer to "an account's own jurisdiction(s)" and "an outside
> jurisdiction" rather than repeating the literal list from the table above every time — look up
> the account's row for the exact values. Where a _concrete_ outside-jurisdiction example is
> useful, Session 5 uses `ainq` (not in U5's assigned set, `utph`/`ak`). For the prefix-collision
> check in Sessions 5 and 6, `ut` and `utph` are used: `ut` is a short jurisdiction code that is
> also a literal prefix of `utph`, which is exactly the shape of collision worth testing.

### 0.2 Baseline capture (do this BEFORE deploying the change)

For U1–U4 on the _current_ (pre-deploy) build, record: visible nav items, the Manage Connections
row count, and which action buttons are enabled on each page. Sessions 1–4 compare against this.
Screenshots are ideal — "access is unchanged" is only checkable against something.

### 0.3 Environment

- [ ] Deploy the branch to the test environment.
- [ ] Confirm `OPERATIONS_GROUP=IZG Operations` is set (unchanged behaviour depends on it).
- [ ] Have CloudWatch / log access ready — the last section of this plan reads log output.

> **Sessions are cached for 30 minutes.** Between role changes in Okta, sign out fully (or use a
> private window). A stale JWT will show pre-change group membership and produce confusing
> results.

### 0.4 Prep credentials (do this once, while signed in as U1 in Session 1)

Several later checks need a credential to already exist in a specific jurisdiction. Identify or
create these up front so you're not hunting for test data mid-session:

- [ ] A credential in jurisdiction **`ainq`** — used throughout Session 5 as the concrete
      "outside U5's assigned set" example.
- [ ] A credential in jurisdiction **`utph`** — used in Session 3 (outside U3's set) and in
      Session 5's prefix-collision check.
- [ ] A credential in jurisdiction **`ut`** — used in Session 5's prefix-collision check. `ut` is
      a short jurisdiction code that is also a literal prefix of `utph`, which is why this pair is
      worth testing together.
- [ ] Any existing credential in jurisdiction **`ak`** works for Session 3's case-fold check —
      every account holds `ak`, so no dedicated setup is needed there.

---

## Session 1 — U1 (self admin, `IZG Operations`)

Global reach, full permissions on every page. This is the baseline everything else is compared
against, and the account used to prep test data for later sessions.

- [ ] Complete the credential-prep checklist from Setup (0.4) while you're here.
- [ ] Nav shows: Manage Connections, Onboarding Senders, API Key Mgmt, Admin Ops, Access
      Control, Console — all visible. Matches the 0.2 baseline.
- [ ] Manage Connections lists every jurisdiction's destinations (same rows as baseline).
      Row actions available: Test, Schedule Maintenance, Edit, View History, View Change Request,
      Reset Circuit Breaker.
- [ ] Edit page: Change Credentials, Create Change Request, Approve Change Request, Save
      Draft, Reset Draft, Run Draft Test all match baseline enablement. Change Request page: Run
      Health Check, View Jira Ticket, Reschedule, Cancel, View Details, **Deploy** (IZG Operations
      only) all match baseline. History page: all five view flags match baseline.
- [ ] API Key Management lists credentials from **all** organizations; Create, Revoke,
      Renew, Cancel all available.
- [ ] Can open Admin Operations, Access Control, and Console. On Access Control → Deny
      List and → File Type List, sees the Add button and can add/remove entries.
- [ ] Can reset a circuit breaker on any destination → succeeds.
- [ ] Sees the **OUR API** button and the Manage Connections CTA on the home page.
- [ ] Can act on credentials in _any_ jurisdiction, including ones outside U3's or U5's
      assigned sets (e.g. `utph` — outside U3's set; `ainq` — outside U5's set) — confirms the
      global role isn't accidentally scoped by the escalation-guard changes.

---

## Session 2 — U2 (`izgsupport@mail.com`, `IZG Support`)

Global reach, but **zero** API-key permissions — this asymmetry (reach without that one
permission) is the other half of the escalation Session 5 tests for. Confirming U2 alone is
correctly powerless on API keys is what makes Session 5's finding meaningful.

- [ ] Nav shows Manage Connections and Onboarding Senders only — no API Key Mgmt, Admin
      Ops, Access Control, or Console.
- [ ] Manage Connections shows **every** jurisdiction's connections (global reach).
- [ ] Read-tier: no Edit/Create/Approve on the Edit page; Run Health Check and View
      Details available on Change Request; all History views available.
- [ ] API Key Mgmt nav is hidden; direct URL to `/apikeys` shows no credentials and no
      action buttons.
- [ ] Cannot reach Admin Operations, Access Control, or Console (nav hidden, direct URL
      blocked by `AdminGuard`).
- [ ] Attempting a circuit breaker reset → **401 unauthorized**.
- [ ] Sees the **OUR API** button (operations-tier affordance) and the Manage Connections
      CTA.
- [ ] **Negative control for Session 5.** Temporarily add `Jurisdiction Support` to this account
      in Okta, so it holds two roles — `IZG Support` and `Jurisdiction Support` — **neither** of
      which is allowed to reset a circuit breaker. Sign back in and attempt a reset → still
      **401**. Revert the temporary group afterward. _(Confirms the combined-role check correctly
      finds nothing, not just that it correctly finds something — the positive case is covered in
      Session 6.)_

---

## Session 3 — U3 (`jurisdictionops@mail.com`, `Jurisdiction Operations`)

Scoped, full permissions within its own jurisdictions. This session also covers a case-fold
correctness check. The prefix-_collision_ check needs the `ut`/`utph` pair, which U3 doesn't hold,
so that one runs in Sessions 5 and 6 instead.

- [ ] Nav shows Manage Connections, Onboarding Senders, and API Key Mgmt — no Admin Ops,
      Access Control, or Console.
- [ ] Manage Connections shows only U3's assigned jurisdictions (matches baseline). Row
      actions available (Test, Schedule Maintenance, Edit, View History, View Change Request,
      Reset Circuit Breaker) — matches baseline.
- [ ] Write-tier: same Edit/Change Request/History enablement as U1, minus Deploy.
- [ ] API Key Mgmt lists **only** U3's own jurisdictions' credentials — confirm the
      `utph` credential from Setup does **not** appear.
- [ ] Cannot reach Admin Operations, Access Control, or Console.
- [ ] Can reset a circuit breaker within its own jurisdictions → succeeds.
- [ ] Does **not** see the OUR API button. Sees the Manage Connections CTA.
- [ ] Cannot act on a credential from a jurisdiction outside its assigned set — use the
      `utph` credential from Setup. Every mutating route (revoke/cancel/renew/create) →
      **403**.
- [ ] **Case fold.** Identify (or temporarily edit) an `ak` credential whose stored
      jurisdiction prefix is uppercase (`AK`). Confirm U3 (whose claim is lowercased `ak` at
      ingestion) still sees and can act on it — same value, different case, must still match. If
      your test data already stores it lowercase, temporarily edit the stored prefix to uppercase
      to exercise this specific check.

---

## Session 4 — U4 (`jurisdictionsupport@mail.com`, `Jurisdiction Support`)

Scoped, read-tier only — and zero API-key permissions, so it's the natural account for confirming
the API (not just the UI) is the real boundary.

- [ ] Nav shows Manage Connections and Onboarding Senders only.
- [ ] Manage Connections shows only U4's assigned jurisdictions.
- [ ] Read-tier, matching U2's pattern but scoped to its own jurisdictions.
- [ ] API Key Mgmt nav hidden; no credentials, no actions.
- [ ] Cannot reach any admin surface.
- [ ] Circuit breaker reset attempt → **401 unauthorized**.
- [ ] Does not see the OUR API button.
- [ ] **UI gating is not the boundary.** Navigate directly to `/apikeys` via URL. The page
      may render, but the credential list is empty and no action buttons appear. Then confirm
      server-side: `GET /api/apikeys` via browser devtools or curl with the session cookie →
      **403**. The API must refuse regardless of what the UI shows.

---

## Session 5 — U5 (`izgsupport-jurisdictionops@mail.com`) — 🚦 RELEASE GATE

**The single most important session in this plan.** U5 = `IZG Support` (global reach, _no_
API-key rights) + `Jurisdiction Operations` (scoped to `utph`, `ak`). The bug this guards against:
combining IZG Support's global reach with Jurisdiction Operations' API-key permission would expose
**every organization's** credentials — access neither role grants alone. It cannot be found by
testing any single role, which is why Sessions 1–4 alone are not sufficient sign-off.

Use the `ainq` credential prepped in Setup as the concrete "outside U5's reach" example throughout.

- [ ] **List scoping.** Open API Key Management. The list contains **only** credentials in
      `utph`/`ak`. _(If the `ainq` credential — or anything from any other jurisdiction —
      appears, STOP. This is the escalation. Fail the build.)_
- [ ] Using the `ainq` credential's `sortKey` (noted from a U1 session), call
      `PATCH /api/apikeys` (revoke) against it → **403 not authorized for this jurisdiction**.
- [ ] Repeat for cancel (`DELETE /api/apikeys`), renew (`POST /api/apikeys/renew`),
      and token reveal (`POST /api/apikeys/token`) → all **403**.
- [ ] `POST /api/apikeys` to create a credential with `jurisdictionId` of the `ainq`
      credential → **403**.
- [ ] `GET /api/apikeys/domains?jurisdictionId=<ainq's jurisdictionId>` → **403**.
- [ ] The Create dialog's Organization dropdown offers **`utph` and `ak` only** — not
      `ainq`, not any other organization.
- [ ] **Prefix collision, part 1.** `ut` and `utph` are a genuine collision-shaped pair in this
      environment: `ut` is a short jurisdiction code that is also a literal prefix of `utph`. U5
      holds `utph` but not `ut` — confirm the `ut` credential prepped in Setup does **not** appear
      in U5's list, and a direct API call against it → **403**. _(The other direction — does `ut`
      alone wrongly match `utph` — is checked in Session 6, since it needs a
      temporarily-reconfigured account.)_
- [ ] Check the `Session established` log line from this login: `roles` lists **both**
      held roles (`IZG Support` and `Jurisdiction Operations`). _(Recording only one would make
      "which role authorized this action?" unanswerable in an incident.)_

If everything above passes, the core risk this entire change exists to prevent is verified.
Sessions 6–8 cover additional multi-role combinations that are lower-stakes than this one.

---

## Session 6 — U6 (`jurisdictionsupport-jurisdictionops@mail.com`)

`Jurisdiction Support` + `Jurisdiction Operations`, both scoped to the same jurisdictions
(`ak`, `utph`, `ut`) — this tests that a union of two _same-tier_ roles correctly grants the
stronger role's permissions, without the cross-role mixing risk Session 5 covers (both roles reach
the same jurisdictions here, so there's no reach/permission mismatch to exploit).

- [ ] API Key Management appears in nav (Support alone would hide it).
- [ ] Can Create / Revoke / Renew / Cancel keys within its assigned jurisdictions.
- [ ] Sees only credentials in its assigned jurisdictions.
- [ ] On Manage Connections, has the Operations-tier buttons (Edit, Schedule Maintenance).
- [ ] Can reset a circuit breaker in one of its assigned jurisdictions. _(The reset permission is
      satisfied by `Jurisdiction Operations`, even though this account also holds
      `Jurisdiction Support`, which alone would not qualify — the negative case for this was
      covered in Session 2.)_
- [ ] **Order independence, the original defect.** Note current permissions, then sign out.
      In Okta, remove and re-add the two groups in the **opposite order**. Sign in again —
      permissions must be identical. _(Before this change, the surviving role depended on the
      order Okta returned groups in.)_
- [ ] **Prefix collision, part 2.** Temporarily remove `utph` from this account in Okta, leaving
      it with just `ak, ut`. Sign in again. The `utph` credential prepped in Setup must **not**
      appear in the list, and a direct API call against it → **403**. This isolates whether `ut`
      alone incorrectly matches `utph` via substring — the actual regression a naive "starts with"
      or "includes" check would reintroduce. Revert the temporary group afterward.
- [ ] Revoke, cancel, renew, and create an API key, and view a token. Each resulting log
      line (`API key revoked` / `cancelled` / `renewed` / `created...` / `token viewed`) carries a
      `grantedBy` field naming the specific role that authorized it — not just which roles the
      user holds overall. This is the per-action version of the login-time snapshot from
      Session 5: it answers "which role authorized _this_ mutation," not just "which roles did
      this user have at login."

---

## Session 7 — U7 (`unmapped@mail.com`, `CDC Program` only)

Tests that an Okta group with no role mapping is inert — it must neither grant anything nor
suppress a real role added alongside it.

- [ ] Signs in successfully but has no console permissions: no API Key Mgmt, no admin
      pages, no connection actions.
- [ ] In Okta, add `Jurisdiction Operations` to this account. Sign in again → full Jurisdiction
      Operations access. The unmapped group contributes nothing and **does not suppress** the
      working role. _(This combination was broken roughly half the time before the change.)_

---

## Session 8 — U8 (`izgoperations-jurisdictionsupport@mail.com`)

`IZG Operations` + `Jurisdiction Support` — a global, fully-permissioned role paired with a
scoped, low-permission one. Confirms adding a lesser role never _removes_ what the stronger role
already grants.

- [ ] Retains full IZG Operations access: admin pages reachable, all jurisdictions visible
      on Manage Connections, all API-key actions available for any organization.
- [ ] Adding the lesser role (`Jurisdiction Support`) took nothing away from the above.

---

## Cross-cutting checks (not tied to one account)

### Logging shape (verify once, on any login from the sessions above)

- [ ] On each login, exactly **one** `Session established` line is emitted.
- [ ] It contains a `groups` array (merged) and a `roles` array — **not** a singular
      `role` field.
- [ ] `sessionId`, `jti`, and `authTime` are still present and unchanged in shape.

### Failure handling (needs deliberate fault injection)

- [ ] Attempt an action against a jurisdiction with no `prefix` configured → request is
      denied and a **warn** line "jurisdiction has no prefix" appears.
- [ ] If a DynamoDB failure can be simulated during an authz check → request denied and an
      **error** line is logged. _(Previously an outage looked identical to a legitimate deny — an
      empty list with nothing alerting.)_

### Okta group-ingestion resilience (needs an Okta admin; use any spare account)

If Okta config cannot be changed in the test tenant, mark each row **N/A** and rely on the
automated tests in `rolemapping.test.ts`, which cover all of these directly.

- [ ] Rename an Okta group to a different case/separator — e.g. `IZG Operations` →
      `izg-operations`. The user retains the same access after re-login. Try `IZG_OPERATIONS` and
      `IZG   Operations` too — same result. _(Before this change, any of these silently granted
      nothing.)_
- [ ] With the groups claim configured on the ID token only → role resolves. On the access
      token only → still resolves. From userinfo only → still resolves. In several places at once
      → resolves once, no duplication, no error.
- [ ] Add the user to an unrelated Okta group (e.g. `Everyone`, or a group from another
      app). Login succeeds, permissions unchanged, no error logged.
- [ ] Simulate a userinfo outage (block the endpoint / revoke the scope) and sign in.
      Login still succeeds; roles still resolve from the token claims; jurisdictions are empty
      (scoped users see an empty credential list; global users are unaffected); an **error** is
      logged for the userinfo failure.
- [ ] Groups claim as a JSON-encoded string, a comma-separated string, or an array of
      objects (Okta's `{ name, label, value, profile.name }` shapes) → role still resolves in
      every case. Groups claim published under `Groups`, `group`, or `Group` instead of `groups`
      → role still resolves.

### Session lifecycle (any account works unless noted)

Only checks that exercise the new roles-recomputed-on-every-read behavior — generic session
mechanics (expiry, deep links, browser refresh) aren't touched by this change and are out of
scope here.

- [ ] In-flight sessions survive deploy: sign in _before_ deploying, keep the tab open,
      deploy, then continue using the app. Permissions still resolve correctly (roles are
      recomputed from token groups on every session read — no re-login required).
- [ ] Role change takes effect after re-login: change a user's Okta groups; the running
      session keeps old permissions for up to 30 minutes; after sign-out/in, new permissions
      apply. _(Pre-existing behaviour — confirm it is not made worse.)_
- [ ] Sign-out / sign-in loop works cleanly for a multi-role user (use U6 or U8).

---

## Sign-off

| Covers                                  | Sessions      | Result | Tester | Date | Notes |
| ---------------------------------------- | ------------- | ------ | ------ | ---- | ----- |
| Single-role regression                  | 1–4           |        |        |      |       |
| **Escalation & tenancy (release gate)** | **5**         |        |        |      |       |
| Multi-role behaviour                    | 6–8           |        |        |      |       |
| Logging & failure handling              | Cross-cutting |        |        |      |       |
| Okta group-ingestion resilience         | Cross-cutting |        |        |      |       |
| Session lifecycle                       | Cross-cutting |        |        |      |       |

**Release gate:** Session 5 must pass in full. Its **list scoping** check is the specific
regression a flat permission union would reintroduce, and it's invisible to single-role testing.
