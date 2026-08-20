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

| # | Account | Role | Expected API Key access |
|---|---------|------|--------------------------|
| 1 | *(your IZG Operations login)* | IZG Operations (with admin flag) | Full — list/create/revoke/renew/cancel, **and** multi-environment create |
| 2 | **`jurisdictionops@mail.com`** | Jurisdiction Operations | Full, but scoped to that account's own jurisdiction(s) only |
| 3 | *(support login)* | IZG Support **or** Jurisdiction Support | No API Key access at all |
| 4 | *(optional)* | IZG Program, CDC Program, or CDC CISO | Unmapped role — no API Key access (deny-by-default) |

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

- [ ] 1.1 Open the API Key Management page as Account #1. The **KEYS** tab loads with
      stat cards (Total Keys / Active / Revoked) and a grid with columns: Description,
      Environment, Organization, DNS, Status, Created, Expires, Created By, Action.
- [ ] 1.2 Confirm the grid defaults to sorting by **Created, descending** (newest key
      first). Click the Created column header to confirm manual re-sort still works.
- [ ] 1.3 Click **FILTERS**. Confirm three filter groups: Environment, Status,
      Organization. Set one of each and confirm the grid narrows to matching rows only,
      and an active-count badge appears on the Filters button.
- [ ] 1.4 Status options include: Active, Ready for Validation, Grace Period, Expired,
      Revoked, Cancelled. Organization options list every jurisdiction **the caller owns**
      — including orgs with no keys yet, and **not** restricted to senders (that
      restriction applies only to the Create dialog, see §2.2). Per-role scoping of this
      list is verified in §12.4.
- [ ] 1.5 Type into the search box (matches key ID or organization) while a filter is
      also active — confirm both apply together (composed, not either/or).
- [ ] 1.6 Click **Clear all** in the Filters popover — confirm every filter resets and
      the full list (still search-filtered if search text remains) returns.
- [ ] 1.7 Confirm **Cancelled** keys are hidden from the default (no Status filter)
      view, and only appear when Status = Cancelled is explicitly selected.
- [ ] 1.8 Empty-state messaging is specific, not a bare "No rows" — filtering to an org
      with no keys must state that plainly, since "this org has no keys yet" is a real
      answer someone checks before creating one:
      - Filter Organization to an owned org that has **no** keys, with no other filter or
        search active → "No API keys for {Org}."
      - Add a Status/Environment filter or search text on top of that → "No API keys for
        {Org} match the current filters."
      - Apply only a Status/Environment filter or search that matches nothing (no org
        filter) → "No API keys match the current filters."
      - In an environment with no credentials at all → "No API keys yet."
      - Confirm the **Audit Log** tab still shows "Audit log coming soon." (unchanged).

---

## 2. Create Key — existing authorized domain (fast path)

- [ ] 2.1 As Account #1 or `jurisdictionops@mail.com`, click **Create Key**. Step 1 asks
      for Organization, Environment, DNS name, Use Types, Description (optional).
- [ ] 2.2 Organization dropdown lists **senders only** (jurisdictions with a non-empty
      `useTypes`) — confirm a destination-only jurisdiction does NOT appear here (even
      though it does appear in the dashboard's Organization filter, §1.4). Both lists are
      additionally scoped to what the caller owns (§12.4).
- [ ] 2.3 Select an organization that has a registered `useTypes` set narrower than the
      full enum. Confirm the Use Types picker only offers that organization's registered
      types.
- [ ] 2.4 Select the organization with **no** `useTypes` seeded. Confirm the Use Types
      picker falls back to the full enum (PATIENT / PROVIDER / PUBLIC_HEALTH) rather than
      blocking creation.
- [ ] 2.5 Pick an environment/domain combination that is **already DNS-authorized**
      (re-use a domain from a previous successful run). Submit. Confirm the key is
      created immediately (no DNS challenge step) and appears in the grid as **Active**.
- [ ] 2.6 Leave Description blank — confirm it's optional (no validation error), and the
      field label reads "Description (optional)".
- [ ] 2.7 Confirm the new credential's Environment/Organization/DNS columns match what
      was selected, and Expires shows ~1 year from now.

---

## 3. Create Key — new domain (DNS challenge path)

- [ ] 3.1 Start Create Key with a **brand-new** domain not yet authorized for any
      jurisdiction. Submit — the credential is created as **Ready for Validation** and a
      TXT-record challenge is shown: instructions to add a TXT record at the **domain
      apex itself** (e.g. `example.gov`, not `_izg-verify.example.gov`), value
      `izg-challenge=<uuid>`.
- [ ] 3.2 Add the TXT record with your DNS provider (or enable the bypass flag per
      Prerequisites) and click Validate.
      - **Real DNS:** allow for propagation delay; a "Validation" transient state should
        show while polling.
      - **Bypass enabled:** confirm a short artificial delay, then success — and confirm
        a `logger.warn` was emitted server-side for the bypass.
- [ ] 3.3 On success, confirm the credential flips to **Active**, `issuedAt`/`expiresAt`
      are stamped at that moment (expiry ~1 year from *now*, not from when the record was
      first created), and the View Key dialog is offered.
- [ ] 3.4 Click **View key** and confirm the JWT is shown exactly once. Close the dialog,
      reopen the row's View action — confirm the token is **not** re-displayed (see §6).
- [ ] 3.5 Negative case: submit an obviously wrong TXT value (or mismatched host) and
      confirm a clear failure message, with the option to retry.
- [ ] 3.6 Negative case: let the challenge sit past its expiry window (or simulate by
      checking behavior on an old pending record) — confirm a stale challenge cannot be
      validated and the user is prompted to start over.

---

## 4. Multi-Environment Create (IZG Operations only)

- [ ] 4.1 As Account #1 (IZG Operations/admin), open Create Key and confirm the
      Environment field allows **selecting more than one** environment.
- [ ] 4.2 Select 2+ environments for a domain authorized in only one of them. Submit and
      confirm it's rejected — a multi-env credential requires the domain to be authorized
      (or successfully challenged) in **every** requested environment.
- [ ] 4.3 Select 2+ environments all authorized (or all willing to go through the
      challenge) — confirm a single successful DNS TXT lookup authorizes **every**
      pending environment (no separate challenge per environment).
- [ ] 4.4 As `jurisdictionops@mail.com` (Account #2, non-admin), attempt the same multi-env
      selection **directly via the UI** if exposed, and also confirm the Environment
      picker is restricted to single-select for this role. If you can reach the raw API
      (e.g. via browser devtools), confirm `POST /api/apikeys` with 2+ environments
      returns **403** for this role even though it can create single-env keys.
- [ ] 4.5 Confirm a resulting multi-env credential's Environment column lists all
      selected environments (comma-separated).

---

## 5. View / Reveal Token (exactly once)

- [ ] 5.1 Immediately after creating a key (§2 or §3), reveal the token once — confirm it
      displays correctly and the "viewed" state is recorded (e.g. row no longer offers a
      first-time "unviewed" indicator, if the UI shows one).
- [ ] 5.2 Attempt to view the token a second time on the same key. Confirm it is refused
      (a "already viewed" style message), not silently re-shown and not a generic error.
- [ ] 5.3 (If feasible) Open the same key in two tabs and click "View key" in both at
      nearly the same time — confirm only one succeeds and the other gets the same
      already-viewed response, not a server error.

---

## 6. Renew

- [ ] 6.1 On an **Active** key, click **Renew key**. Confirm the dialog prepopulates
      Domain, Organization, and Environment(s) as **read-only** (not editable).
- [ ] 6.2 Submit. Confirm: a brand-new credential is created and immediately shown as
      Active; the **old** credential transitions to **Grace Period** (not Revoked).
- [ ] 6.3 Confirm the old (now grace-period) credential's grace window is ~10 business
      days, and it remains usable until then.
- [ ] 6.4 Renew a key whose expiry is **within 30 days**: confirm the new key's expiry is
      `old expiry + 1 year` (continuity), not `now + 1 year`.
- [ ] 6.5 Renew a key whose expiry is **more than 30 days** away: confirm the new key's
      expiry is `now + 1 year`.
- [ ] 6.6 Confirm Renew is **not offered** on a Ready for Validation, Grace Period,
      Revoked, Cancelled, or Expired key — only Active.
- [ ] 6.7 As `jurisdictionops@mail.com`, attempt to renew a credential belonging to a jurisdiction it
      does **not** own (directly via API if the UI hides the action) — confirm 403, and
      confirm the error does not leak the credential's actual status.

---

## 7. Revoke

- [ ] 7.1 On an **Active** or **Grace Period** key, click **Revoke key**. Confirm the
      dialog uses destructive copy (warns this "cannot be undone") and offers an optional
      reason field.
- [ ] 7.2 Confirm Revoke is **not offered** on a Ready for Validation key (only Cancel is,
      see §8).
- [ ] 7.3 Confirm revoking decrements the Active stat card and increments Revoked, and
      the row's status becomes **Revoked** with a revocation date shown.
- [ ] 7.4 Revoke a **Grace Period** key (one currently superseded by a renewal) — confirm
      it revokes cleanly and does not affect the successor key.
- [ ] 7.5 As `jurisdictionops@mail.com`, attempt to revoke a credential belonging to a jurisdiction it
      does **not** own — confirm 403 before any status information is revealed.

---

## 8. Cancel

- [ ] 8.1 On a **Ready for Validation** key (pending DNS challenge), click **Cancel key**.
      Confirm the dialog/toast wording says "cancelled" (not "removed" or "deleted").
- [ ] 8.2 Confirm the cancelled row disappears from the default Keys view but reappears
      when Status = Cancelled is selected (§1.7), and shows `cancelledBy`/`cancelledAt`.
- [ ] 8.3 Confirm Cancel is **not offered** on Active or Grace Period keys — only Revoke
      is available there (§7.2 is the mirror check).
- [ ] 8.4 As `jurisdictionops@mail.com`, attempt to cancel a pending credential belonging to a
      jurisdiction it does not own — confirm 403.

---

## 9. Expired key & Re-issue

> Expired is a **derived** status (never stored) — the fastest way to reach it in test
> data is a key whose `expiresAt` has already passed, or by adjusting system/test clock
> data if your environment supports it.

- [ ] 9.1 Confirm a key past its `expiresAt` (with no grace period involved) shows status
      **Expired** in the grid.
- [ ] 9.2 For a renewed key: confirm the Grace-Period-vs-Expired-vs-Revoked precedence —
      if the hard expiry (`exp`) falls at or before the grace-period end, it shows
      **Expired**, not Revoked, once the grace window would otherwise have ended.
- [ ] 9.3 On an Expired key, click **Re-issue key**. Confirm the dialog looks like Renew
      (prefilled, read-only fields) but is labeled **Re-issue**.
- [ ] 9.4 Confirm re-issue creates a **brand-new** credential (fresh key ID, `now + 1
      year` expiry — no continuity with the old key's expiry) and leaves the old expired
      key completely untouched (no status change, no grace period).
- [ ] 9.5 If the domain's own DNS authorization has also lapsed, confirm re-issue routes
      through the DNS challenge first, same as a brand-new domain (§3). If the domain
      authorization is still valid, confirm it issues immediately with no DNS step.
- [ ] 9.6 Confirm Revoked and Cancelled keys offer **no** lifecycle action at all — no
      Renew, no Re-issue.

---

## 10. Duplicate-scope guardrail

- [ ] 10.1 Create a key for organization/domain X with environment E and use type(s) U.
      Then start Create Key again for the **same** organization, domain, environment(s),
      and use type(s) while the first key is still Active.
- [ ] 10.2 Confirm a warning appears recommending **Renew** instead, but does not block
      the action.
- [ ] 10.3 Click through anyway ("Create Anyway" on the second attempt) — confirm it
      succeeds and a second, genuinely duplicate-scope key is created.
- [ ] 10.4 Change just the environment or just a use type from the existing active key's
      scope — confirm **no** warning appears (only an *exact* scope match triggers it).

---

## 11. Global domain exclusivity

- [ ] 11.1 As `jurisdictionops@mail.com`, verify (or create-and-verify) domain `shared-test.example.gov`
      for its own jurisdiction. Confirm success.
- [ ] 11.2 As a **different** jurisdiction (switch accounts, or use another
      Jurisdiction-Operations login), attempt to create a key with `dnsChoice: other` for
      the **same** domain `shared-test.example.gov`. Confirm it is refused immediately
      (before any DNS challenge is issued) — a domain already owned by another
      jurisdiction is rejected up front.
- [ ] 11.3 Attempt to push a second jurisdiction's TXT record through to actual
      verification for that same domain (if reachable) — confirm the authoritative claim
      at verify-time also refuses it, even if the DNS TXT check itself would have passed.
- [ ] 11.4 As the **original owning** jurisdiction, re-verify the same domain again (e.g.
      to add a new environment) — confirm this succeeds (idempotent for the true owner),
      and the newly requested environment gets authorized.

---

## 12. Role-based access control (RBAC)

- [ ] 12.1 Log in as **IZG Support** or **Jurisdiction Support** (Account #3). Confirm
      the API Key Management nav link is **not shown** at all.
- [ ] 12.2 If you can reach `/apikeys` directly by URL as Account #3, confirm the page
      does not function / actions are unavailable — and directly hitting an API route
      (e.g. `GET /api/apikeys` via devtools) returns **403**.
- [ ] 12.3 Log in as **`jurisdictionops@mail.com`** (Account #2, Jurisdiction Operations).
      Confirm `GET /api/apikeys` (the Keys grid) shows **only** credentials for
      jurisdiction(s) this account owns — not the full list. An **empty** grid here is a
      failure, not a pass, if the account owns an org that has keys (see §12.4a).
- [ ] 12.4 As `jurisdictionops@mail.com`, confirm **both** jurisdiction-bearing lists are
      scoped to organizations this account owns:
      - **Create Key → Organization** dropdown: only owned sender orgs, not every sender
        org system-wide. This closes a gap where a scoped role could previously pick an
        unowned org, complete the entire multi-step create flow (including a DNS
        challenge), and only discover the 403 on final submit.
      - **Filters → Organization** options: only owned orgs (all of them, sender or not —
        see §1.4), not every jurisdiction in the system.
      (If a second jurisdiction-scoped account with a *different* owned org is available,
      switch to it and confirm both lists change accordingly.)
- [ ] 12.4a **Prefix-matching regression check** — the highest-value step in this section.
      Ownership is matched on the jurisdiction's **prefix** (e.g. `AINQ`), which is what
      Okta group membership is keyed on — not the numeric `jurisdictionId` and not the
      long-form `name`. Using `jurisdictionops@mail.com`, pick an owned org whose prefix
      differs from both its numeric id and its display name (e.g. id `1000`, name
      "Audacious Inquiry (operators)", prefix `AINQ`) and confirm: the org appears in both
      lists from §12.4, the grid shows its keys, and revoke/renew/cancel on one of those
      keys succeeds. A regression presents as an **empty key list plus 403 on every action
      for the account's own org** — and note it would NOT reproduce under an IZG Operations
      login, since global roles bypass the ownership comparison entirely.
- [ ] 12.5 As `jurisdictionops@mail.com`, confirm Create/Revoke/Renew/Cancel controls are visible for
      owned jurisdictions but that attempting the same actions against a **different**
      jurisdiction's credential (via direct API call) is refused with 403 — and confirm
      the 403 happens **before** any credential-status detail is returned (ownership is
      checked first, so a non-owner can't learn a credential's state).
- [ ] 12.6 Confirm the nav link **is** visible for Jurisdiction Operations (it follows
      `canListApiKeys`, not the coarser admin-only flag).
- [ ] 12.7 (If an account is available) Log in as an unmapped role (IZG Program / CDC
      Program / CDC CISO). Confirm no API Key access anywhere — deny-by-default.
- [ ] 12.8 As Account #1 (IZG Operations), confirm it can see and act on **every**
      jurisdiction's credentials (global access), including multi-environment creation
      (§4), and that its Create Key Organization dropdown lists **every** sender org
      (unlike a scoped role in 12.4).

---

## 13. Use Types

- [ ] 13.1 Attempt to create a key with **no** use type selected — confirm the form
      blocks submission (client-side) and, if bypassed via direct API call, the server
      returns 400.
- [ ] 13.2 Renew or re-issue a key — confirm the new credential **inherits** the previous
      credential's use types automatically (not re-prompted).
- [ ] 13.3 Confirm use types are **not** visible anywhere in the issued JWT (decode the
      token from §5/§3 and check the payload) — they're a server-side property only.

---

## 14. Regression / sanity checks

- [ ] 14.1 Confirm no `env` or `environment` numeric claim appears in a decoded JWT
      payload (identity-only JWT — see design D9).
- [ ] 14.2 Confirm a credential's Environment column renders correctly for both a
      single-environment and a multi-environment credential.
- [ ] 14.3 Spot-check the Audit Log tab loads without error (still a stub — not expected
      to show detailed history yet, per Deferred items).
- [ ] 14.4 General smoke: navigate away from and back to the API Key Management page,
      confirm the grid reloads correctly and no console errors appear in devtools.
- [ ] 14.5 Confirm no browser console errors/warnings appear across the full pass above
      (beyond expected dev-only bypass warnings).

---

## Sign-off

| Section | Tester | Date | Result |
|---|---|---|---|
| 1. Dashboard/Filters | | | |
| 2. Create — existing domain | | | |
| 3. Create — new domain (DNS challenge) | | | |
| 4. Multi-environment | | | |
| 5. View/Reveal token | | | |
| 6. Renew | | | |
| 7. Revoke | | | |
| 8. Cancel | | | |
| 9. Expired & Re-issue | | | |
| 10. Duplicate-scope guardrail | | | |
| 11. Global domain exclusivity | | | |
| 12. RBAC | | | |
| 13. Use Types | | | |
| 14. Regression/sanity | | | |

**Overall result:** ☐ Pass — ready to archive `api-key-management-ui` ☐ Fail — see linked bugs
