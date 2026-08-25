# API Key Management — Manual Test Plan

**Change:** `api-key-management-ui` (IGDD-2707 / 3106 / 3107 / 3184, IGDD-3140)
**Purpose:** End-to-end manual verification of every feature delivered on this branch, to
close out task 12.3 before archiving the OpenSpec change. Covers the full feature —
scope grew well beyond the original four gap-closers (Filters, Revoke/Cancel, DNS
hardening, pagination) to include Use Types, the credential/JWT model reconciliation,
server-side RBAC, global domain exclusivity, and several product guardrails. See
`design.md` (decisions D1–D18) for the reasoning behind any behavior below.

**Out of scope for this manual pass** (already covered by the 69 automated
node-env tests in `lifecycle.test.ts` / `dynamo.apikeyLifecycle.test.ts`, and not
practical to exercise by hand): concurrent-write race conditions (D15, D16),
DynamoDB pagination past the 1MB page limit (D8), and the `ConditionalCheckFailedException`
retry paths.

---

## Prerequisites

**Accounts** — have at least these four logged in (or ready to switch to) via Okta:

| #   | Account                        | Role                                    | Expected API Key access                                                  |
| --- | ------------------------------ | --------------------------------------- | ------------------------------------------------------------------------ |
| 1   | _(your IZG Operations login)_  | IZG Operations (with admin flag)        | Full — list/create/revoke/renew/cancel, **and** multi-environment create |
| 2   | **`jurisdictionops@mail.com`** | Jurisdiction Operations                 | Full, but scoped to that account's own jurisdiction(s) only              |
| 3   | _(support login)_              | IZG Support **or** Jurisdiction Support | No API Key access at all                                                 |
| 4   | _(optional)_                   | IZG Program, CDC Program, or CDC CISO   | Unmapped role — no API Key access (deny-by-default)                      |

Every "Account #2" step below means **`jurisdictionops@mail.com`** — it is the account that
exercises all non-admin / jurisdiction-scoped verification (tenancy denial, list scoping,
org-list scoping, and the prefix-matching regression check in §12.4a). Before starting, note
which jurisdiction(s) this account actually owns, since several steps depend on having one
org it owns and one it does not.

**Test data**

- At least two jurisdictions seeded with `useTypes` (senders) — one with a narrow set
  (e.g. only `PATIENT`), one with more than one use type.
- At least one jurisdiction with **no** `useTypes` seeded, to verify the "unseeded
  sender" fallback.
- A jurisdiction `jurisdictionops@mail.com` (Account #2) does **not** own, to test
  cross-tenant denial — plus at least one it **does** own, for the positive cases.
- One or more DNS domains you control (or the DNS bypass, see below) for the new-domain
  challenge flow.

**Environment config**

- To test the DNS challenge without owning a real domain: set `ALLOW_DNS_VERIFY_BYPASS=true`
  in a **non-production** environment (`NODE_ENV !== 'production'`). Confirm a
  `logger.warn` line appears in server logs whenever it's used — the bypass must never be
  silent.
- Note the app's `NEXT_PUBLIC_APP_ENV` — it filters which Environment options
  (Production/Test/Onboarding/PreProduction/Development, ids 1–5) are selectable from
  this deployment.

**Legend:** `[ ]` = not yet run · `[x]` = passed · `[!]` = failed (log a bug and link it here)

---

## 1. Dashboard, Filters, Search, Sorting

- [x] 1.1 Open the API Key Management page as Account #1. The **KEYS** tab loads with
      stat cards (Total Keys / Active / Revoked) and a grid with columns: Description,
      Environment, Organization, DNS, Status, Created, Expires, Created By, Action.
      **Verification Notes:** All Columns and stat cards shown on screen
- [x] 1.2 Confirm the grid defaults to sorting by **Created, descending** (newest key
      first). Click the Created column header to confirm manual re-sort still works.
      **Verification Notes:** Sort by Created descending order.
- [x] 1.3 Click **FILTERS**. Confirm three filter groups: Environment, Status,
      Organization. Set one of each and confirm the grid narrows to matching rows only,
      and an active-count badge appears on the Filters button.
      **Verification Notes:** Filters working as expected
- [x] 1.4 Status options include: Active, Ready for Validation, Grace Period, Expired,
      Revoked, Cancelled. Organization options list every jurisdiction **the caller owns**
      — including orgs with no keys yet, and **not** restricted to senders (that
      restriction applies only to the Create dialog, see §2.2). Per-role scoping of this
      list is verified in §12.4.
      **Verification Notes:** Verified the options are as expected
- [x] 1.5 Type into the search box (matches key ID or organization) while a filter is
      also active — confirm both apply together (composed, not either/or).
      **Verification Notes:** Confirmed with both filters
- [x] 1.6 Click **Clear all** in the Filters popover — confirm every filter resets and
      the full list (still search-filtered if search text remains) returns.
      **Verification Notes:** Confirmed with filters cleared
- [x] 1.7 Confirm **Cancelled** keys are hidden from the default (no Status filter)
      view, and only appear when Status = Cancelled is explicitly selected.
      **Verification Notes:** Confirmed cancelled are hidden
- [x] 1.8 Empty-state messaging is specific, not a bare "No rows" — filtering to an org
      with no keys must state that plainly, since "this org has no keys yet" is a real
      answer someone checks before creating one: - Filter Organization to an owned org that has **no** keys, with no other filter or
      search active → "No API keys for {Org}." - Add a Status/Environment filter or search text on top of that → "No API keys for
      {Org} match the current filters." - Apply only a Status/Environment filter or search that matches nothing (no org
      filter) → "No API keys match the current filters." - In an environment with no credentials at all → "No API keys yet." - Confirm the **Audit Log** tab still shows "Audit log coming soon." (unchanged).
      **Verification Notes:** Confirmed each empty-state variant in turn — org-only
      filter showed "No API keys for {Org}.", adding a status/env/search filter on
      top of that showed "No API keys for {Org} match the current filters.", a
      status/env/search filter alone (no org) showed "No API keys match the current
      filters.", and an environment with no credentials at all showed "No API keys
      yet." The Audit Log tab still showed "Audit log coming soon."

---

## 2. Create Key — existing authorized domain (fast path)

- [x] 2.1 As Account #1 or `jurisdictionops@mail.com`, click **Create Key**. Step 1 asks
      for Organization, Environment, DNS name, Use Types, Description (optional).
      **Verification Notes:** Verified
- [x] 2.2 Organization dropdown lists **senders only** (jurisdictions with a non-empty
      `useTypes`) — confirm a destination-only jurisdiction does NOT appear here (even
      though it does appear in the dashboard's Organization filter, §1.4). Both lists are
      additionally scoped to what the caller owns (§12.4).
      **Verification Notes:** Verified only senders show in the list
- [x] 2.3 Select an organization that has a registered `useTypes` set narrower than the
      full enum. Confirm the Use Types picker only offers that organization's registered
      types.
      **Verification Notes:** Verified
- [x] 2.4 Pick an environment/domain combination that is **already DNS-authorized**
      (re-use a domain from a previous successful run). Submit. Confirm the key is
      created immediately (no DNS challenge step) and appears in the grid as **Active**.
      **Verification Notes:** Verified
- [x] 2.5 Leave Description blank — confirm it's optional (no validation error), and the
      field label reads "Description (optional)".
      **Verification Notes:** Verified
- [x] 2.6 Confirm the new credential's Environment/Organization/DNS columns match what
      was selected, and Expires shows ~1 year from now.
      **Verification Notes:** Verified

---

## 3. Create Key — new domain (DNS challenge path)

- [x] 3.1 Start Create Key with a **brand-new** domain not yet authorized for any
      jurisdiction. Submit — the credential is created as **Ready for Validation** and a
      TXT-record challenge is shown: instructions to add a TXT record at the **domain
      apex itself** (e.g. `example.gov`, not `_izg-verify.example.gov`), value
      `izg-challenge=<uuid>`.
      **Verification Notes:** Started Create Key with a brand-new, unregistered
      domain — got Ready for Validation status and a challenge screen showing TXT
      record instructions pointing at the domain apex (not a `_izg-verify.`
      subdomain), value `izg-challenge=<uuid>`.
- [x] 3.2 Add the TXT record with your DNS provider (or enable the bypass flag per
      Prerequisites) and click Validate. - **Real DNS:** allow for propagation delay; a "Validation" transient state should
      show while polling. - **Bypass enabled:** confirm a short artificial delay, then success — and confirm
      a `logger.warn` was emitted server-side for the bypass.
      **Note: When a user forget to copy the DNS challenge and close the dialog box. The user cant view it again, They have redo the whole process. This is not a bug but to confirm with team on the behaviour.**
- [x] 3.3 On success, confirm the credential flips to **Active**, `issuedAt`/`expiresAt`
      are stamped at that moment (expiry ~1 year from _now_, not from when the record was
      first created), and the View Key dialog is offered.
      **Verification Notes:** After a successful TXT validation, the credential
      flipped to Active immediately, `issuedAt`/`expiresAt` were stamped at that
      moment (not backdated to when the challenge was first created), and the View
      Key dialog was offered automatically.
- [x] 3.4 Click **View key** and confirm the JWT is shown exactly once. Close the dialog,
      reopen the row's View action — confirm the token is **not** re-displayed (see §6).
      **Verification Notes:** Viewed the JWT once from the success dialog, closed it,
      then check the row — the action to view token was not shown again.
- [x] 3.5 Negative case: submit an obviously wrong TXT value (or mismatched host) and
      confirm a clear failure message, with the option to retry.
      **Verification Notes:** Submitted an incorrect TXT value — got "TXT
      record found" style failure message with ability to retry
      option.
- [x] 3.6 Negative case: let the challenge sit past its expiry window (or simulate by
      checking behavior on an old pending record) — confirm a stale challenge cannot be
      validated and the user is prompted to start over.
      **Verification Notes:** Simulated by backdating the pending ApiKeyDomain row's
      `challengeExpiresAt` (entityType=ApiKeyDomain, sortKey=<env>#<jurisdictionId>#
      <domain>) to a past date directly in DynamoDB, then clicked Validate on the
      still-pending credential. Got "Challenge has expired. Please start over."
      (400); the credential remained Ready for Validation and no domain was
      authorized.

---

## 4. Multi-Environment Create (IZG Operations only)

- [x] 4.1 As Account #1 (IZG Operations/admin), open Create Key and confirm the
      Environment field allows **selecting more than one** environment.
      **Verification Notes:** Confirmed can select multiple environments for a admin user
- [x] 4.2 Select 2+ environments for a domain authorized in only one of them. Submit and
      confirm it's rejected — a multi-env credential requires the domain to be authorized
      (or successfully challenged) in **every** requested environment.
      **Verification Notes:** The Create dialog's own dropdown can't select a
      partially-authorized domain (its options are pre-filtered to domains authorized
      in every selected environment), so this required a direct API call. From an
      authenticated browser console (Account #1), called `POST /api/apikeys` with
      `environments: [2, 5]` and a `upn` authorized for environment 2 only. Got back
      400 "Selected DNS name is not currently authorized for environment 5" — no
      credential was created.
- [x] 4.3 Select 2+ environments all authorized (or all willing to go through the
      challenge) — confirm a single successful DNS TXT lookup authorizes **every**
      pending environment (no separate challenge per environment).
      **Verification Notes:** Confirmed the only one DNS challenge is shown
- [x] 4.4 As `jurisdictionops@mail.com` (Account #2, non-admin), attempt the same multi-env
      selection **directly via the UI** if exposed, and also confirm the Environment
      picker is restricted to single-select for this role. If you can reach the raw API
      (e.g. via browser devtools), confirm `POST /api/apikeys` with 2+ environments
      returns **403** for this role even though it can create single-env keys.
      **Verification Notes:** Confirmed the Environment field renders as single-select
      for this account — no multi-select control is exposed. From an authenticated
      console tab, called `POST /api/apikeys` directly with `environments: [2, 5]` for
      an owned jurisdiction — got 403 "Only administrators may create a
      multi-environment key". A follow-up call with a single environment succeeded,
      confirming the 403 is specific to the multi-env count, not a blanket denial.
- [x] 4.5 Confirm a resulting multi-env credential's Environment column lists all
      selected environments (comma-separated).
      **Verification Notes:** Verified multi-env shown in the column

---

## 5. View / Reveal Token (exactly once)

- [x] 5.1 Immediately after creating a key (§2 or §3), reveal the token once — confirm it
      displays correctly and the "viewed" state is recorded (e.g. row no longer offers a
      first-time "unviewed" indicator, if the UI shows one).
      **Verification Notes:** Verified the view option is not shown
- [x] 5.2 Attempt to view the token a second time on the same key. Confirm it is refused
      (a "already viewed" style message), not silently re-shown and not a generic error.
      **Verification Notes:** Reloaded the page after viewing the token once — the
      View icon stayed hidden (the "viewed" flag is server-persisted, not client
      state). Then called `POST /api/apikeys/token` again from the console with the
      same sortKey — got 410 "This token has already been viewed and cannot be
      retrieved again", with no token present in the response body.

---

## 6. Renew

- [x] 6.1 On an **Active** key, click **Renew key**. Confirm the dialog prepopulates
      Domain, Organization, and Environment(s) as **read-only** (not editable).
      **Verification Notes:** Opened Renew on an Active key — Domain, Organization,
      and Environment(s) were pre-filled and shown as read-only, with no way to edit
      them before submitting.
- [x] 6.2 Submit. Confirm: a brand-new credential is created and immediately shown as
      Active; the **old** credential transitions to **Grace Period** (not Revoked).
      **Verification Notes:** Submitted the renewal — a new credential appeared
      immediately as Active, and the original credential's status changed to Grace
      Period, not Revoked.
- [x] 6.3 Confirm the old (now grace-period) credential's grace window is ~10 business
      days, and it remains usable until then.
      **Verification Notes:** Confirmed the grace-period credential's window showed
      ~10 business days out, and it stayed usable (not blocked) during that window.
- [x] 6.4 Renew a key whose expiry is **within 30 days**: confirm the new key's expiry is
      `old expiry + 1 year` (continuity), not `now + 1 year`.
      **Verification Notes:** Backdated an Active credential's `expiresAt` attribute
      (DynamoDB, ApiKeyCredential item) to ~20 days from today, then renewed it. The
      new key's Expires date was old expiry + 1 year (~20 days from today + 1 year),
      not today + 1 year — confirming the continuity branch.
- [x] 6.5 Renew a key whose expiry is **more than 30 days** away: confirm the new key's
      expiry is `now + 1 year`.
      **Verification Notes:** Renewed a freshly-created Active key (expiry ~1 year
      out, well past the 30-day window). The new key's Expires showed ~1 year from
      today, not ~2 years out — confirming the "more than 30 days" branch uses
      `now + 1 year`.
- [x] 6.6 Confirm Renew is **not offered** on a Ready for Validation, Grace Period,
      Revoked, Cancelled, or Expired key — only Active.
      **Verification Notes:** Checked each non-Active status in turn — none of Ready
      for Validation, Grace Period, Revoked, or Cancelled showed a Renew icon.
      Expired showed a distinct Re-issue action instead, not Renew.
- [x] 6.7 As `jurisdictionops@mail.com`, attempt to renew a credential belonging to a jurisdiction it
      does **not** own (directly via API if the UI hides the action) — confirm 403, and
      confirm the error does not leak the credential's actual status.
      **Verification Notes:** From an authenticated console tab, called
      `POST /api/apikeys/renew` with a foreign, non-owned credential's sortKey — got
      403 "Forbidden - not authorized for this jurisdiction", not a 409 status-based
      error, confirming ownership is checked before the credential's state is
      revealed.

---

## 7. Revoke

- [x] 7.1 On an **Active** or **Grace Period** key, click **Revoke key**. Confirm the
      dialog uses destructive copy (warns this "cannot be undone") and offers an optional
      reason field.
      **Verification Notes:** Opened Revoke on an Active key — the dialog used
      destructive wording ("cannot be undone") and included an optional reason field.
- [x] 7.2 Confirm Revoke is **not offered** on a Ready for Validation key (only Cancel is,
      see §8).
      **Verification Notes:** Confirmed a Ready for Validation row shows only a
      Cancel action — no Revoke option is present.
- [x] 7.3 Confirm revoking decrements the Active stat card and increments Revoked, and
      the row's status becomes **Revoked** with a revocation date shown.
      **Verification Notes:** Revoked a key — the Active stat card count decreased by
      one, Revoked increased by one, and the row showed status Revoked with a
      revocation date.
- [x] 7.4 Revoke a **Grace Period** key (one currently superseded by a renewal) — confirm
      it revokes cleanly and does not affect the successor key.
      **Verification Notes:** Revoked a Grace Period key that had already been
      superseded by a renewal — it revoked cleanly, and the successor (renewed) key
      remained unaffected and Active.
- [x] 7.5 As `jurisdictionops@mail.com`, attempt to revoke a credential belonging to a jurisdiction it
      does **not** own — confirm 403 before any status information is revealed.
      **Verification Notes:** From an authenticated console tab, called
      `PATCH /api/apikeys` against a foreign, non-owned credential's sortKey — got 403
      "Forbidden - not authorized for this jurisdiction" rather than any status-based
      (409) message, confirming ownership is checked first.

---

## 8. Cancel

- [x] 8.1 On a **Ready for Validation** key (pending DNS challenge), click **Cancel key**.
      Confirm the dialog/toast wording says "cancelled" (not "removed" or "deleted").
- [x] 8.2 Confirm the cancelled row disappears from the default Keys view but reappears
      when Status = Cancelled is selected (§1.7), and shows `cancelledBy`/`cancelledAt`.
- [x] 8.3 Confirm Cancel is **not offered** on Active or Grace Period keys — only Revoke
      is available there (§7.2 is the mirror check).
- [!] 8.4 As `jurisdictionops@mail.com`, attempt to cancel a pending credential belonging to a
  jurisdiction it does not own — confirm 403.
  - This is an issue! I was able to Cancel something I didn't own. Should this user even see those keys?
  - I added this ticket: https://izgateway.atlassian.net/browse/IGDD-3342

---

## 9. Expired key & Re-issue

> Expired is a **derived** status (never stored) — the fastest way to reach it in test
> data is a key whose `expiresAt` has already passed, or by adjusting system/test clock
> data if your environment supports it.

- [x] 9.1 Confirm a key past its `expiresAt` (with no grace period involved) shows status
      **Expired** in the grid.
  - I had created an API Key with a script with an expired date.
  - \*\* One issue though, the database field status still said active.
- [x] 9.2 For a renewed key: confirm the Grace-Period-vs-Expired-vs-Revoked precedence —
      if the hard expiry (`exp`) falls at or before the grace-period end, it shows
      **Expired**, not Revoked, once the grace window would otherwise have ended.
  - Paul's steps to test
  - On Aug 24, create a key that expires on Aug 24 at 10am
  - On Aug 24, renew the key
  - On Aug 24 10am, check that the original key now shows as expired. It did show as expired!
- [x] 9.3 On an Expired key, click **Re-issue key**. Confirm the dialog looks like Renew
      (prefilled, read-only fields) but is labeled **Re-issue**.
- [x] 9.4 Confirm re-issue creates a **brand-new** credential (fresh key ID, `now + 1
year` expiry — no continuity with the old key's expiry) and leaves the old expired
      key completely untouched (no status change, no grace period).
- [x] 9.5 If the domain's own DNS authorization has also lapsed, confirm re-issue routes
      through the DNS challenge first, same as a brand-new domain (§3). If the domain
      authorization is still valid, confirm it issues immediately with no DNS step.
  - I confirmed both: DNS auth had lapsed and when DNS auth is valid, it issues immediately
- [x] 9.6 Confirm Revoked and Cancelled keys offer **no** lifecycle action at all — no
      Renew, no Re-issue.

---

## 10. Duplicate-scope guardrail

- [x] 10.1 Create a key for organization/domain X with environment E and use type(s) U.
      Then start Create Key again for the **same** organization, domain, environment(s),
      and use type(s) while the first key is still Active.
- [x] 10.2 Confirm a warning appears recommending **Renew** instead, but does not block
      the action.
- [X & !] 10.3 Click through anyway ("Create Anyway" on the second attempt) — confirm it
  succeeds and a second, genuinely duplicate-scope key is created.
  - It did, but it did not recognize that the domain authorization had already been done. Should this be considered a bug?
  - Ticket I created: https://izgateway.atlassian.net/browse/IGDD-3341
- [x] 10.4 Change just the environment or just a use type from the existing active key's
      scope — confirm **no** warning appears (only an _exact_ scope match triggers it).
  - This worked fine

---

## 11. Global domain exclusivity

- [x] 11.1 As `jurisdictionops@mail.com`, verify (or create-and-verify) domain `shared-test.example.gov`
      for its own jurisdiction. Confirm success.
  - Note, we may want to use a domain where we can control the TXT record - we can't do that with shared-test.example.gov
- [!] 11.2 As a **different** jurisdiction (switch accounts, or use another
  Jurisdiction-Operations login), attempt to create a key with `dnsChoice: other` for
  the **same** domain `shared-test.example.gov`. Confirm it is refused immediately
  (before any DNS challenge is issued) — a domain already owned by another
  jurisdiction is rejected up front.
  - This seems to be a real issue. I created shared-test.example.giv with user: jurisdictionops@mail.com, then I tried with my user, and it allowed the duplicate.
  - I created this bug ticket for it: https://izgateway.atlassian.net/browse/IGDD-3340
- [ ] 11.3 Attempt to push a second jurisdiction's TXT record through to actual
      verification for that same domain (if reachable) — confirm the authoritative claim
      at verify-time also refuses it, even if the DNS TXT check itself would have passed.
  - Isn't this an invalid scenario if 11.2 works as intended?
- [ ] 11.4 As the **original owning** jurisdiction, re-verify the same domain again (e.g.
      to add a new environment) — confirm this succeeds (idempotent for the true owner),
      and the newly requested environment gets authorized.
  - I can't test that quite yet.

---

## 12. Role-based access control (RBAC)

- [x] 12.1 Log in as **IZG Support** or **Jurisdiction Support** (Account #3). Confirm
      the API Key Management nav link is **not shown** at all.
  - Logged in with jurisdictionsupport@mail.com
- [X & !] 12.2 If you can reach `/apikeys` directly by URL as Account #3, confirm the page
  does not function / actions are unavailable — and directly hitting an API route
  (e.g. `GET /api/apikeys` via devtools) returns **403**.
  - The page shows up empty, unusable, and I see the 403 error in debug tools, but don't we want to not show the page at all?
  - I create this ticket for it: https://izgateway.atlassian.net/browse/IGDD-3339
- [x] 12.3 Log in as **`jurisdictionops@mail.com`** (Account #2, Jurisdiction Operations).
      Confirm `GET /api/apikeys` (the Keys grid) shows **only** credentials for
      jurisdiction(s) this account owns — not the full list. An **empty** grid here is a
      failure, not a pass, if the account owns an org that has keys (see §12.4a).
- [x] 12.4 As `jurisdictionops@mail.com`, confirm **both** jurisdiction-bearing lists are
      scoped to organizations this account owns: - **Create Key → Organization** dropdown: only owned sender orgs, not every sender
      org system-wide. This closes a gap where a scoped role could previously pick an
      unowned org, complete the entire multi-step create flow (including a DNS
      challenge), and only discover the 403 on final submit. - **Filters → Organization** options: only owned orgs (all of them, sender or not —
      see §1.4), not every jurisdiction in the system.
      (If a second jurisdiction-scoped account with a _different_ owned org is available,
      switch to it and confirm both lists change accordingly.)
- [x] 12.4a **Prefix-matching regression check** — the highest-value step in this section.
      Ownership is matched on the jurisdiction's **prefix** (e.g. `AINQ`), which is what
      Okta group membership is keyed on — not the numeric `jurisdictionId` and not the
      long-form `name`. Using `jurisdictionops@mail.com`, pick an owned org whose prefix
      differs from both its numeric id and its display name (e.g. id `1000`, name
      "Audacious Inquiry (operators)", prefix `AINQ`) and confirm: the org appears in both
      lists from §12.4, the grid shows its keys, and revoke/renew/cancel on one of those
      keys succeeds. A regression presents as an **empty key list plus 403 on every action
      for the account's own org** — and note it would NOT reproduce under an IZG Operations
      login, since global roles bypass the ownership comparison entirely.
- [x] 12.5 As `jurisdictionops@mail.com`, confirm Create/Revoke/Renew/Cancel controls are visible for
      owned jurisdictions but that attempting the same actions against a **different**
      jurisdiction's credential (via direct API call) is refused with 403 — and confirm
      the 403 happens **before** any credential-status detail is returned (ownership is
      checked first, so a non-owner can't learn a credential's state).

  - I got it to work by running these in the browser's debug session in its console:
    This one got the expected 403:

    await (await fetch('/api/apikeys', {
       method: 'DELETE',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ sortKey: 'cb272bc7-a1a5-41ef-ab5f-28a95c57a052' })
    })).json().then(b => console.log(b))

    This one succeeded as expected:

    await (await fetch('/api/apikeys', {
       method: 'DELETE',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ sortKey: '24e86969-d4ca-4d74-b648-f0f66f580ee9' })
    })).json().then(b => console.log(b))

    ALSO Ran:
    const FOREIGN_SORTKEY = 'cb272bc7-a1a5-41ef-ab5f-28a95c57a052'
    const FOREIGN_JUR = '1001'
    const MY_JUR = '1000'

    const call = async (label, method, url, body) => {
    const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    })
    console.log(label, r.status, await r.json().catch(() => ({})))
    }

    // revoke, cancel, view-token: jurisdiction is derived from the STORED credential
    await call('revoke ', 'PATCH', '/api/apikeys', { sortKey: FOREIGN_SORTKEY, reason: 'test' })
    await call('cancel ', 'DELETE', '/api/apikeys', { sortKey: FOREIGN_SORTKEY })
    await call('token ', 'POST', '/api/apikeys/token', { sortKey: FOREIGN_SORTKEY })

    // THE key case: foreign credential + MY OWN jurisdictionId in the body.
    // If the body value were trusted, this would succeed. It must still 403.
    await call('renew ', 'POST', '/api/apikeys/renew', { oldSortKey: FOREIGN_SORTKEY, jurisdictionId: MY_JUR })

    // create is the one route where jurisdictionId legitimately comes from the body
    await call('create ', 'POST', '/api/apikeys', {
    jurisdictionId: FOREIGN_JUR, environments: [1], upn: 'idor-test.example.org',
    dnsChoice: 'other', useTypes: ['PATIENT'],
    })

- [x] 12.6 Confirm the nav link **is** visible for Jurisdiction Operations (it follows
      `canListApiKeys`, not the coarser admin-only flag).
  - Yes, I can see the nav link to API keys
- [x] 12.7 (If an account is available) Log in as an unmapped role (IZG Program / CDC
      Program / CDC CISO). Confirm no API Key access anywhere — deny-by-default.
  - I was not able to see API Keys UI options when logging in as a generic user
- [x] 12.8 As Account #1 (IZG Operations), confirm it can see and act on **every**
      jurisdiction's credentials (global access), including multi-environment creation
      (§4), and that its Create Key Organization dropdown lists **every** sender org
      (unlike a scoped role in 12.4).
  - I used account izgoperations@mail.com to verify this. Looks good.

---

## 13. Use Types

- [x] 13.1 Attempt to create a key with **no** use type selected — confirm the form
      blocks submission (client-side) and, if bypassed via direct API call, the server
      returns 400.

  - I used this in the browser debug console:
    - await (await fetch('/api/apikeys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
      jurisdictionId: '1',
      environments: [2],
      upn: 'test.example.gov',
      dnsChoice: 'other',
      useTypes: []
      })
      })).json().then(b => console.log(b))
      0q4va38vzi7jv.js:5 POST https://dev.console.izgateway.org/api/apikeys 400 (Bad Request)
      window.fetch @ 0q4va38vzi7jv.js:5
      await in window.fetch
      (anonymous) @ VM120:1
      VM120:11 {error: 'useTypes must be a non-empty array'}

- [x] 13.2 Renew or re-issue a key — confirm the new credential **inherits** the previous
      credential's use types automatically (not re-prompted).
- [x] 13.3 Confirm use types are **not** visible anywhere in the issued JWT (decode the
      token from §5/§3 and check the payload) — they're a server-side property only.

---

## 14. Regression / sanity checks

- [x] 14.1 Confirm no `env` or `environment` numeric claim appears in a decoded JWT
      payload (identity-only JWT — see design D9).
- [x] 14.2 Confirm a credential's Environment column renders correctly for both a
      single-environment and a multi-environment credential.
- [x] 14.3 Spot-check the Audit Log tab loads without error (still a stub — not expected
      to show detailed history yet, per Deferred items).
- [x] 14.4 General smoke: navigate away from and back to the API Key Management page,
      confirm the grid reloads correctly and no console errors appear in devtools.
- [x] 14.5 Confirm no browser console errors/warnings appear across the full pass above
      (beyond expected dev-only bypass warnings).

---

## Sign-off

| Section                                | Tester | Date | Result |
| -------------------------------------- | ------ | ---- | ------ |
| 1. Dashboard/Filters                   | Anusha |      |        |
| 2. Create — existing domain            | Anusha |      |        |
| 3. Create — new domain (DNS challenge) | Anusha |      |        |
| 4. Multi-environment                   | Anusha |      |        |
| 5. View/Reveal token                   | Anusha |      |        |
| 6. Renew                               | Anusha |      |        |
| 7. Revoke                              | Anusha |      |        |
| 8. Cancel                              | Paul   |      |        |
| 9. Expired & Re-issue                  | Paul   |      |        |
| 10. Duplicate-scope guardrail          | Paul   |      |        |
| 11. Global domain exclusivity          | Paul   |      |        |
| 12. RBAC                               | Paul   |      |        |
| 13. Use Types                          | Paul   |      |        |
| 14. Regression/sanity                  | Paul   |      |        |

**Overall result:** ☐ Pass — ready to archive `api-key-management-ui` ☐ Fail — see linked bugs
