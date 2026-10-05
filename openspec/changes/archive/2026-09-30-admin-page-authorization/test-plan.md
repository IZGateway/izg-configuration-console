# Test Plan — Admin Page Authorization (IGDD-3472)

**For the tester.** Everything you need is in this document. You do not need to read the code or
any other document in this folder.

---

## What this change does, in plain terms

Today, several Configuration Console admin pages can be opened by **any** signed-in user just by
typing the URL. The menu hides the links, so the pages look protected, but the pages themselves
never check who you are. Some of the buttons on those pages work — including one that rotates the
database encryption key.

After this change:

1. **Every page checks your role on the server before it loads anything.**
2. **If you are not allowed in, the page shows you a message.** It does not silently bounce you
   somewhere else, which is what four of these pages do today.
3. **Every denial is recorded in the audit log**, so we can see who tried to reach what.
4. **Every API endpoint declares who may call it.** Six endpoints gained a real check where they
   previously had none, or had one that was broken.

**No role gains any access it does not have today.** Access only ever narrows. That is the single
most important property to confirm — see *Stop the release* at the end.

### The two things we must prove

| # | What | How |
|---|---|---|
| **1** | A denied user sees **a message on the page** | **Screenshots only.** No automated test can check what appears on screen, so every check marked 📸 must be screenshotted and attached to the ticket. This document is the acceptance evidence. |
| **2** | A denied request writes **one audit log entry** | Part 5 |

Automated tests already cover the role-permission data, the menu visibility, and the status codes
the API returns. **Do not re-test those by hand.** What only you can test is that real pages render,
real workflows still work, and the permissions match how people actually do their jobs.

### What you will do, and roughly how long

| Part | What | When | Rough time |
|---|---|---|---|
| **0** | Set up accounts and your browser | Before anything | 30 min |
| **1** | 🔴 Record how things behave **today** | **Before the new build is deployed** | 1½ hours, 3 sign-ins |
| 2 | Reference tables — read, don't run | — | 5 min |
| **3 + 4** | Test each of the 5 accounts, and the API | After deploy | 4 hours, 5 sign-ins |
| 5 | Check the audit log | After Part 3 | 45 min |
| 6 | End-to-end regression | Developer runs these | — |

---

## Part 0 — Setup

### 0.1 Before anything else

- [ ] **0.1a** Confirm with the developer that the build is deployed to the test environment and
      that the build, the automated tests and the lint check all passed.
- [ ] **0.1b** Confirm you can search the application log (Elastic / CloudWatch) for that
      environment. You need it in Part 5. Check now, not in four hours.
- [ ] **0.1c** ⚠️ **Ask the developer to confirm that the `OPERATIONS_GROUP` setting in this
      environment names the Okta group that maps to the `IZG Operations` role.** If it does not,
      Part 3 will show differences that look like bugs in this change and are not. **Get a yes
      before you start.**

### 0.2 Test accounts

You need five accounts, one per role. **Each account must resolve to exactly one role.** An account
with two roles gets the permissions of both, and every "expect a denial" check below becomes
meaningless.

⚠️ **The table below is a template — fill it in before you start.** Reuse the accounts from the
`multi-role-permissions` and `sender-role-access` test plans. Everything later refers to accounts
as **A1–A5**, so the labels are what matter, not the emails.

| # | Account email | Role | Can see | Why this account matters |
|---|---|---|---|---|
| A1 | *(fill in)* | `IZG Operations` | everything | Has every permission. Nothing may change for them. |
| **A2** | *(fill in)* | **`IZG Support`** | all jurisdictions | **🚦 The release gate.** Loses the most. |
| A3 | *(fill in)* | `Jurisdiction Operations` | one jurisdiction | Uses the one endpoint whose access narrows |
| A4 | *(fill in)* | `Jurisdiction Support` | one jurisdiction | Reaches Onboarding differently from everyone else |
| A5 | *(fill in)* | `Sender Operations` | own organisation only | Could write records it should never have been able to |

- [ ] **0.2a** Fill in the table above.
- [ ] **0.2b** A3 and A4 **must share the same jurisdiction.** Write it here: `____________`.
      Wherever this plan says `ut`, substitute it.
- [ ] **0.2c** Write A5's organisation here: `____________`. Wherever this plan says `ainq`,
      substitute it.
- [ ] **0.2d** For **each** account, sign in, press **F12**, click **Console**, and run:

      ```js
      (await (await fetch('/api/auth/session')).json()).user.roles
      ```

      It must print **exactly one** role, and it must be the one in the table above.
      **Write the output down** — the same value must appear in the audit entries you check in
      Part 5.

> **Placeholders.** Wherever this plan writes `{id}`, `{slug}` or `{sortKey}`, substitute a real
> value from the environment. Ask the developer for one if you are not sure where to find it.

### 0.3 Switching accounts

**One account per session. Sign out completely between accounts**, or use a separate browser
profile for each.

Your role is captured when you sign in and the session lasts **30 minutes**. If you switch accounts
without signing out, you will see the previous account's permissions and it will look like a bug.

### 0.4 How to run an API check

Several checks ask you to call an API endpoint directly. **You must do this from the browser's
developer tools Console, on a tab where you are already signed in.** You cannot use `curl`,
Postman, or the address bar.

> 🔴 **The single most common mistake: typing an `/api/...` URL into the address bar.**
> **Every** `/api/...` URL redirects to the sign-in page that way — signed in or not, endpoint
> present or absent, permission held or denied. You get the same redirect on the old build and the
> new one. **A redirect to sign-in means you used the wrong tool.** It never means the endpoint is
> protected, and it never means the endpoint is gone.
>
> The only exceptions are `/api/healthcheck` and `/api/deephealthcheck`, which are deliberately
> open to everyone (check 4.5a).

**Steps, once per session:**

1. Sign in to the console in a normal browser tab. **Wait for the page to finish loading.**
2. Press **F12**, click the **Console** tab.
3. Run the readiness check below. **It must pass, or nothing else in this part means anything.**
4. Paste the helper below.
5. Then paste each check's snippet and read the result.

#### Step 3 — 🔴 Readiness check

```js
window.fetch.toString().includes('native code')
```

**It must print `false`.**

If it prints `true`, the tab has not finished setting up its secure connection to the API, and
**every API check will silently hand you the sign-in page instead of the endpoint.** Reload the
page, wait for it to finish, and run it again.

**If it still prints `true`, or a later check returns `INVALID`:**

1. **Use one address for the whole session.** Reaching the same environment by two different
   addresses gives the browser two separate security identities while sharing one sign-in, and
   that breaks every API call. Pick the normal address and stay on it.
2. Sign out, then sign back in.
3. Still failing: DevTools → **Application** → delete all cookies for the site **and** delete the
   `izg-session` entry under **IndexedDB**. Then sign in again.
4. Check the **Network** tab for a request called `bind-session`. Anything other than `200` means
   the tab never established its secure connection, and no API check from it is trustworthy.
   **Report that** — it does not mean the change is broken, but it does block you.

#### Step 4 — the helper

```js
window.probe = async (url, method = 'GET', body) => {
  const r = await fetch(url, { method, ...(body && {
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) })
  if (r.redirected || r.url.includes('/api/auth/signin')) {
    console.error('❌ INVALID —', method, url, 'was sent to the sign-in page instead.',
                  '\n   This check did NOT reach the endpoint. Re-run the readiness check (0.4).')
    return 'INVALID'
  }
  console.log(method, url, '→', r.status, '|', (await r.text()).slice(0, 120))
  return r.status
}
```

Then each check is one line, for example:

```js
await probe('/api/rotatekey', 'POST')
```

> ⚠️ **Do not simplify the helper to `fetch(url).then(r => r.status)`.** A plain `fetch` **follows
> the redirect to the sign-in page and reports that page's `200`** — so a check that was never
> delivered looks like a check that succeeded. Every "expect this to work" step in Part 1 would
> tick green while nothing happened at all.

**What the results mean:**

| Result | Meaning |
|---|---|
| **`INVALID`** | 🔴 **The check did not run.** Go back to the readiness check. **Do not record a result.** |
| **200** / **2xx** | Allowed. The call worked. |
| **403** | **Denied by permissions.** This is what most checks below expect. |
| **401** | Denied because the destination is outside the account's jurisdiction. |
| **405** | That method is not offered on that endpoint. |
| **404** | The endpoint does not exist. |
| *nothing at all* | The call never finished. This is a real (and expected) before-state in Part 1. |

⚠️ **Some snippets change data.** Anything marked **THROWAWAY ENVIRONMENT ONLY** must not be run
against an environment anyone depends on. If you cannot use a throwaway environment, skip that
check and write "skipped — not a throwaway environment" beside it.

### 0.5 If something fails

Record these five things. Without them nobody can tell a wrong permission value from a bug:

1. **Which account** (A1–A5) and the roles you recorded in 0.2d.
2. **The check number**, e.g. `3.2o`.
3. **What you expected and what happened.**
4. **A screenshot** for anything on screen; **the exact status number** for an API check.
5. **The time**, so the developer can find the matching log entry.

**Two failures mean different things, and saying which saves a day:**

| Symptom | What it usually means |
|---|---|
| A page or action is blocked that **should** work | A **permission value** is wrong. One-line data fix. |
| A page or action works that **should** be blocked | A **gate is missing**. Code fix. |

---

## Part 1 — Record what happens today

# 🔴 Do this BEFORE the new build is deployed

**This part cannot be redone later.** Without it, "the permissions are too strict" and "the
permissions are correct" look identical afterwards.

Three sessions: A2, then A4, then A5.

### 1.1 Session — as A2 (`IZG Support`), on the current build

Type each URL into the address bar.

> **The four admin pages behave differently from each other today — do not expect them to match.**
> Screenshot whichever behaviour you see.

- [ ] 📸 **1.1a** Landing page — **the "OUR API" button is present.** This is the one button A2
      visibly loses.
- [ ] 📸 **1.1b** `/accesscontrol` — **the page opens completely**, including the **Add**, **edit
      (pencil)** and **delete (trash)** controls on the Access Groups tab.
- [ ] 📸 **1.1c** `/console` — **the page opens but shows a red permission warning** where the
      console content should be.
- [ ] 🚨 📸 **1.1d** `/passwordencryption` — **the page opens with both encryption buttons on it.**
      Combined with check **1.4a** below, this means **A2 can rotate the live database encryption
      key by clicking a button.** This is the most serious finding in the change — capture it
      carefully.
      *(The buttons may be greyed out if this environment has no encryption key name configured.
      That is a configuration setting, not a permission. Record which you see.)*
- [ ] 📸 **1.1e** `/adminoperations` — **it flashes "Loading..." then jumps to
      `/manageconnections`.** No message, no explanation. A2 never saw this page.
- [ ] 📸 **1.1f** `/apikeys` — **"Loading...", then jumps to `/manageconnections`.**
- [ ] 📸 **1.1g** `/api-doc` — **"Loading...", then jumps to `/manageconnections`.** Not a blank
      page.
- [ ] **1.1h** Open a change request. Confirm the **"Need to make changes?" card is not there.**
      Expect **no visible change** here after the deploy.
- [ ] **1.1i** Write down which menu entries are visible.

Now the API checks, from the Console (see 0.4):

- [ ] 🚨 **1.1j** `await probe('/api/rotatekey', 'POST')` → **`200`.**
      ⚠️ **THROWAWAY ENVIRONMENT ONLY — this rotates the live database encryption key.** If you
      cannot use one, skip it and use your 1.1d screenshot as the evidence. Do not rotate a real
      key to prove a point.
- [ ] **1.1k** `await probe('/api/api-middleware-helper')` → **nothing comes back. The call never
      finishes.** Wait 30 seconds to be sure, then record it. *(This endpoint should never have
      existed — it is an internal file that was accidentally being served.)*
- [ ] **1.1l** `await probe('/api/changerequest/deploy/{id}')` → **nothing comes back. The call
      never finishes.** Wait 30 seconds. Same symptom as 1.1k, different cause: this endpoint is
      real, but it simply never replies to anyone who is not an admin.
- [ ] 📸 **1.1m** Cancel a change request **belonging to a different organisation** — one A2 has no
      business touching:

      ```js
      await probe('/api/changerequest/{id}', 'DELETE')
      ```

      **It succeeds.** The button is hidden in the UI, but the endpoint behind it never checked
      anything.

Finally, the question that matters most in this whole part:

- [ ] 🔴 **1.1n Ask the real IZG Support users: do you use any of these four pages as part of your
      job?** `/accesscontrol`, `/adminoperations`, `/console`, `/passwordencryption`.
      **If the answer is yes to any of them, stop and raise it before the deploy.** It means a
      permission value is wrong, and this is the cheapest possible moment to find out.

### 1.2 Session — as A4 (`Jurisdiction Support`), on the current build

- [ ] 📸 **1.2a** `/apikeys` — **"Loading...", then jumps to `/manageconnections`.**

### 1.3 Session — as A5 (`Sender Operations`), on the current build

- [ ] 📸 **1.3a** `/manageconnections` — **jumps to the home page `/`.** This is the easiest of the
      silent jumps to miss, because it looks like you simply landed on Home.
- [ ] 📸 **1.3b** `/onboarding` — **the page opens.** Any signed-in user can reach it today.
- [ ] 🚨 📸 **1.3c** From the Console, add a sender record directly. Use values that are valid in
      this environment — open the Onboarding screen as A1 first to see what real ones look like:

      ```js
      await probe('/api/allowedusers', 'POST', {
        principal:     'testplan-igdd3472@example.com',
        environment:   2,
        destinationId: '<a real destination id>',
        organization:  '<a real organisation>',
        enabled:       true,
        createdBy:     'IGDD-3472 test plan',
        updatedBy:     'IGDD-3472 test plan',
      })
      ```

      **It succeeds** (`2xx`). Any signed-in account could add sender records.
      **Then delete the record you created** — sign in as A1 and remove it from the Onboarding
      screen.

      **Keep the exact snippet you used.** Check 3.5e re-runs it expecting `403`, and this is the
      single most consequential before/after pair in the plan.

      *(A `400` listing missing fields means your values were wrong, not that the endpoint is
      protected. Fix the values and retry — the point of this check is that it is **not**
      protected.)*

---

# 🚀 Deploy the new build now

Everything below is against the new build.

---

## Part 2 — Reference: what you are looking for

**Read this part. There is nothing to run.** Part 3 tells you when to use it.

### 2.1 What the access-denied message looks like

Every denied page shows the same screen:

| Element | Exact text |
|---|---|
| Heading | **"You do not have access to this page."** |
| Sub-heading | "This page is restricted to specific roles." |
| Bullet 1 | "Your account may not hold the role this page requires." |
| Bullet 2 | "Group membership is captured when you sign in. If you were granted a new role recently, sign out and sign in again…" |
| Bullet 3 | "If you believe you should have access, contact support with the page address and the time you tried." |
| Buttons | **"Need Help"** and **"Back to Home"** |

Plus three things that are just as important as the message:

- The **address bar still shows the URL you asked for.** You were not moved.
- The **navigation menu still renders** around the message.
- The **browser tab title** names the page you were denied — see 2.3.

### 2.2 Which pages allow and deny, per account

**✓** = the page opens normally · **DENY** = the access-denied message from 2.1

| Page | A1 IZG Ops | A2 IZG Sup | A3 Jur Ops | A4 Jur Sup | A5 Sender Ops |
|---|---|---|---|---|---|
| `/manageconnections` | ✓ | ✓ | ✓ | ✓ | **DENY** |
| `/onboarding` | ✓ | ✓ | ✓ | ✓ | **DENY** |
| `/apikeys` | ✓ | **DENY** | ✓ | **DENY** | ✓ |
| `/accesscontrol` | ✓ | **DENY** | **DENY** | **DENY** | **DENY** |
| `/adminoperations` | ✓ | **DENY** | **DENY** | **DENY** | **DENY** |
| `/console` | ✓ | **DENY** | **DENY** | **DENY** | **DENY** |
| `/passwordencryption` | ✓ | **DENY** | **DENY** | **DENY** | **DENY** |
| `/api-doc` | ✓ | DENY\* | DENY\* | DENY\* | DENY\* |

\* `/api-doc` shows the message but writes **no** audit entry. Expected — see *Do not file these
as bugs*.

**And what each DENY used to be:**

| Page | Before the change |
|---|---|
| `/accesscontrol` | Opened completely, for everyone |
| `/console` | Opened, showed a red permission warning |
| `/passwordencryption` | Opened completely, with working buttons, for everyone |
| `/adminoperations` | Flashed "Loading...", then jumped to `/manageconnections` |
| `/apikeys` | Flashed "Loading...", then jumped to `/manageconnections` |
| `/api-doc` | Flashed "Loading...", then jumped to `/manageconnections` |
| `/onboarding` (A5) | Opened completely |
| `/manageconnections` (A5) | Jumped to the home page |

### 2.3 Browser tab titles on a denial

The denial keeps the page's own title. Check the **browser tab**, not the page body — the body text
is always the same.

| URL | Tab must read |
|---|---|
| `/accesscontrol` | Access Control |
| `/adminoperations` | Admin Operations |
| `/console` | Console |
| `/passwordencryption` | Password Encryption |
| `/apikeys` | API Key Management |
| `/manageconnections` | Manage Connections |
| `/onboarding` | Onboarding |
| `/api-doc` | API Documentation |

---

## Part 3 — Session by session

Five sessions, in this order. **A1 first** — if something is broken for A1 it is broken for
everyone, and starting elsewhere wastes four sessions finding that out.

Each session ends with the API checks belonging to that account, so you sign in once per account.

### 3.1 Session 1 — A1 (`IZG Operations`): nothing may change

**A1 holds every permission. Any difference from Part 1 is a bug in this change.**

#### Pages

- [ ] **3.1a** Every page in the **2.2** table opens for A1. All eight.
- [ ] **3.1b** Menu shows: Admin Operations, Access Control, Console, Onboarding Senders,
      Manage Connections, API Key Management — plus the **OUR API** button on the landing page.

#### Access Control

- [ ] **3.1c** All three tabs open.
- [ ] 🔴 **3.1d** On the **Access Groups** tab, **Add**, **edit (pencil)** and **delete (trash)**
      are all present and all work. *(These three had no permission check at all before this
      change, so a wiring mistake shows up here first.)*
- [ ] **3.1e** **Deny List** — add and delete work.
- [ ] **3.1f** **ADS File Types** — add and delete work.

#### Admin Operations — three cards

| Card | What to check |
|---|---|
| Password encryption | Card visible, encryption **status** loads, and **both** buttons present: "Encrypt Unencrypted Passwords" **and** "Rotate Password Encryption Key" |
| Circuit breaker reset | Card visible, and the reset works |
| Database refresh | Card visible, and the refresh works |

> **Greyed out is a pass. Missing is a failure.**
> This change controls whether a control is **visible**, never whether it is **clickable**. A
> button can be visible and greyed out because of an environment setting or the state of the data
> — hover it and the tooltip says why. A permission failure removes the **whole card**, never just
> one button.
>
> ⚠️ **Do not click "Rotate Password Encryption Key"** outside a throwaway environment.

- [ ] **3.1g** All three cards above are present and working.
- [ ] **3.1h** `/passwordencryption` shows the same password card, with the same two buttons.

#### Everything else

- [ ] **3.1i** **Console** opens and returns log results, with **no red permission warning.**
- [ ] **3.1j** **Change requests**: create, reschedule, cancel and **deploy** all work.
- [ ] **3.1k** **Onboarding Senders** end to end: page opens; add / edit / promote / demote /
      delete all succeed.
- [ ] **3.1l** **Manage Connections**: schedule maintenance, reset one destination's circuit
      breaker, open a change request, run a connection test.
- [ ] **3.1m** **API Key Management** works.
- [ ] **3.1n** Edit, History, Test, Change Request and Test Report pages behave as before.
- [ ] 🔴 **3.1o Walk every page and click every action.** All 41 API endpoints now carry a
      permission declaration, so the likeliest failure is one endpoint wired to the wrong
      permission — which shows up as an unexpected denial on something that should work. This
      session is the cheapest place to catch that whole class of problem.

#### API checks for this session

- [ ] **3.1p** Run **4.1g**, **4.1h** (the A1 half), **4.3c**, **4.4a**, **4.7a**, **4.7b**
      (the A1 row), **4.8a**, **4.8b**, **4.8c** and **4.8d**.

### 3.2 Session 2 — A2 (`IZG Support`): 🚦 **RELEASE GATE**

> **Read this before you start, or you will file three of these as regressions.**
>
> - **`/adminoperations` and `/console` denying A2 is intentional and temporary.** The agreed
>   future role model gives IZG Support both. That grant is deliberately held back so this change
>   only ever *removes* access. It is a separate ticket.
> - **Losing the "OUR API" button is intentional.** It led to a page that already rejected A2.
> - **Losing change-request cancel/reschedule is intentional.** The buttons were already hidden;
>   what is removed is the ability to do it by direct API call.

#### Capture the evidence

These five screenshots, paired with your Part 1 ones, are the acceptance evidence for the whole
change. Type each URL, screenshot the denial.

- [ ] 📸 **3.2a** `/accesscontrol` *(pairs with 1.1b, where the page opened completely)*
- [ ] 📸 **3.2b** `/adminoperations` *(pairs with 1.1e, where it jumped away)*
- [ ] 📸 **3.2c** `/console` *(pairs with 1.1c, the red warning)*
- [ ] 📸 **3.2d** `/passwordencryption` *(pairs with 1.1d, the live encryption buttons)*
- [ ] 📸 **3.2e** `/apikeys` *(pairs with 1.1f, where it jumped away)*

#### Check the denial screen

- [ ] **3.2f** The text matches **2.1** exactly, on all five.
- [ ] **3.2g** The **address bar still shows the URL you typed**, on all five. You were not moved.
- [ ] **3.2h** The **navigation menu still renders** around the message.
- [ ] **3.2i** The **browser tab title** matches **2.3** for each page. *(The page body text is
      identical on every page — the tab title is the only thing that differs, so look there.)*
- [ ] **3.2j** **"Back to Home"** goes to `/` and works.
- [ ] **3.2k** **"Need Help"** opens
      `https://support.izgateway.org/plugins/servlet/desk/site/izg`. A 404 there is a real defect
      — report it, even though it is not about permissions.

#### 3.2l Reach a denied page without typing the URL 🔴 **required for check 5.3**

There are two ways to arrive at a page, and the application handles them differently:

| How you got there | What the browser asks the server for |
|---|---|
| Typed in the address bar, or refreshed | `/accesscontrol` — the page itself |
| Moved there from inside the app, no reload | `/_next/data/…/accesscontrol.json` — just the page's data |

**Both must give the same denial and the same audit entry.** The second is the risk: the server is
asked for a long internal URL, and if the audit log recorded *that* instead of `/accesscontrol`,
the security log would fill with internal paths and nobody would notice — because typing a URL
records the right thing either way.

**You cannot do this by clicking, and that is correct.** Every menu entry and every button leading
to a gated page is hidden from exactly the people who would be denied, so no link is left to click.
Ask the application to move there directly:

1. Signed in as **A2**, land on any page you *are* allowed to see.
2. Open DevTools (**F12**), click the **Network** tab, leave it open.
3. Switch to the **Console** tab and run:

   ```js
   next.router.push('/accesscontrol')
   ```

4. The page must change **without the browser reloading** — the Network tab keeps its earlier
   entries and the page does not flash white.

- [ ] **3.2l-i** The denial appears, identical to 3.2a.
- [ ] **3.2l-ii** In the **Network** tab there is a request ending in **`accesscontrol.json`**.
      *(If the whole page reloaded instead, you did a full navigation and this check did not
      happen — make sure you ran the command in the Console.)*
- [ ] **3.2l-iii** The **address bar now reads `/accesscontrol`.**
- [ ] 🔴 **3.2l-iv Note the time.** Check 5.3 needs the audit entry from *this exact navigation*,
      and no other check in the plan produces one.

#### Menu

- [ ] **3.2m** Admin Operations, Access Control and Console entries are **gone** from the menu.
- [ ] **3.2n** Manage Connections and Onboarding Senders are **still there**.
- [ ] 📸 **3.2o** The **"OUR API" button is gone** from the landing page. It was there in 1.1a.

#### What A2 must still be able to do

- [ ] **3.2p** **Manage Connections still shows every jurisdiction.** A2 has global reach.
- [ ] 🔴 **3.2q** **Onboarding Senders works in full** — page, add, edit, delete. A denial here
      means the check was applied too broadly. That is a failure, not an intended change.
- [ ] **3.2r** Viewing change-request details still works. Running a health check still works.
- [ ] **3.2s** The **"Need to make changes?" card is still absent** — unchanged from 1.1h.
- [ ] **3.2t** Test, History and Change Request views behave exactly as in Part 1.

#### What A2 loses — all API-only, nothing visible changes

The bodies below do not matter: the permission check runs **before** the endpoint looks at the
body, so `{}` is fine. A `400` about missing fields would mean the check did not run.

- [ ] **3.2u** `await probe('/api/changerequest/{id}', 'DELETE')` → **`403`.** *(1.1m: this
      succeeded against any organisation in the system.)*
- [ ] **3.2v** `await probe('/api/changerequest', 'PUT', {})` → **`403`** (reschedule).
- [ ] **3.2w** `await probe('/api/changerequest', 'POST', {})` → **`403`** (create).
      Then **confirm no UI path dead-ends** — no button that looks available and then fails.

#### API checks for this session

- [ ] **3.2x** Run **4.1a**–**4.1f**, **4.3b**, **4.4a**, **4.7a** and **4.7b** (the A2 row).

#### 🚦 The gate decision

- [ ] 🚦 **3.2y Re-read your notes from 1.1n.** Confirm **nothing A2 does as part of normal work is
      now blocked.** If something is, report it as a **wrong permission value** — the fix is a
      one-line data change, not a redesign. **Do not waive it.**

### 3.3 Session 3 — A3 (`Jurisdiction Operations`): the endpoint that narrows

Scheduling maintenance is the **only** thing in this change whose access genuinely narrows for a
role that uses it, and A3 is that role. It previously had **no permission and no jurisdiction check
at all** — any signed-in user could schedule maintenance on any destination.

- [ ] 📸 **3.3a** The four admin URLs deny (per **2.2**). Screenshot one. Confirm the Admin
      Operations / Access Control / Console **menu entries are gone**.
- [ ] 🔴 **3.3b** **Schedule a maintenance window on a destination inside `ut`**, from Manage
      Connections. It must be **accepted and displayed.** *(If this fails, the endpoint is wired to
      the wrong permission. Highest-risk check in this session.)*
- [ ] **3.3c** **Schedule maintenance outside `ut` → `401`:**
      `await probe('/api/maintenance/update/2/az', 'POST')` *(substitute a real destination outside
      `ut`)*. This jurisdiction check did not exist before.
- [ ] **3.3d** Resetting **one destination's** circuit breaker still works inside `ut`.
- [ ] **3.3e** The **hub-wide** reset is still denied: `await probe('/api/status/reset', 'POST')` →
      **`403`**. *(Deliberately a different permission from 3.3d — per-destination and hub-wide are
      not the same thing.)*
- [ ] **3.3f** **Change requests: create, reschedule and cancel all still work** inside `ut`.
      A3 holds all three. A denial here means a permission was mapped to the wrong action.
- [ ] **3.3g** **Deploying** a change request is still denied — unchanged from before.
- [ ] **3.3h** Onboarding works.
- [ ] **3.3i** Manage Connections, Test, Edit, Change Request and History otherwise unchanged.
- [ ] **3.3j** Run **4.1h** (the A3 half), **4.4a**, **4.6b**, **4.7a** and **4.7b** (the A3 row).

### 3.4 Session 4 — A4 (`Jurisdiction Support`)

- [ ] 📸 **3.4a** The four admin URLs deny (per **2.2**). Screenshot one. Confirm the menu entries
      are gone.
- [ ] 📸 **3.4b** `/apikeys` → denial message. *(1.2a: it jumped away with no message.)*
- [ ] **3.4c** Manage Connections shows `ut` only — unchanged.
- [ ] **3.4d** The maintenance-scheduling button is still **absent**. It always was.
- [ ] **3.4e** Change requests: **view works**; **cancel and reschedule are denied.** Same removal
      as A2, and again API-only — the buttons were already hidden.
- [ ] 🔴 **3.4f** **Open `/onboarding` and confirm the organisation picker fills with
      organisations.**
      ⚠️ **This is the most easily-broken check in the plan.** A4 reaches the organisation list
      through a different permission from every other role. **An empty picker, or any error, means
      two roles have silently lost Onboarding.** Report it immediately.
- [ ] **3.4g** Test, History and Change Request views unchanged.
- [ ] **3.4h** Run **4.2a**, **4.4a**, **4.7a** and **4.7b** (the A4 row).

### 3.5 Session 5 — A5 (`Sender Operations`): the open write endpoint

- [ ] **3.5a** Menu shows **API Key Management only** — unchanged.
- [ ] **3.5b** API Key Management works end to end for `ainq`.
- [ ] 📸 **3.5c** `/manageconnections` → denial message. *(1.3a: it jumped to the home page, with
      no message and nothing in the audit log.)*
- [ ] 📸 **3.5d** `/onboarding` → denial message. *(1.3b: the page opened.)*
- [ ] **3.5e** The four admin URLs deny (per **2.2**). *(A5 was denied before too, but by being
      jumped away with no message and nothing recorded.)*
- [ ] 🚨 🔴 **3.5f** **Re-run the exact snippet you kept from 1.3c** → **`403`.**
      *(1.3c: it succeeded.)* **This is the single most consequential check in the plan.**
- [ ] 🚨 **3.5g** `await probe('/api/allowedusers', 'DELETE', {})` → **`403`.** *(This also
      succeeded before — any signed-in account could delete sender records.)*
- [ ] **3.5h** `await probe('/api/allowedusers/bydestination')` → **`403`.**
- [ ] **3.5i** `await probe('/api/allowedusersaudit/{slug}')` → **`403`.**
- [ ] **3.5j** `await probe('/api/organizations')` → **`403`.** Then confirm nothing A5 uses
      dead-ends because of it.
- [ ] **3.5k** Run **4.4a**, **4.7a** and **4.7b** (the A5 row).

### 3.6 No session required

- [ ] **3.6a** Run **4.4b** and **4.5a**. Both need a **private window with no sign-in**.

---

## Part 4 — API endpoint detail

Every check here is called out from a Part 3 session — you do not need a separate pass. This part
is the detail: what to run, and what each account should get.

All checks run from the developer tools Console (**0.4**). **`INVALID` means the check did not
run** — fix that before recording anything.

Endpoints are grouped by **who may call them**. Every endpoint in a group behaves the same way, so
one odd result inside a group localises the problem immediately.

### 4.1 Group A — IZG Operations only (14 endpoints)

**Expect: works for A1 · `403` for A2, A3, A4 and A5.**

`/api/accessgroups` · `/api/accessgroups/{sortKey}` · `/api/denylist` · `/api/denylist/{id}` ·
`/api/adsfiletypes` · `/api/adsfiletypes/{id}` · `/api/accesscontrol` · `/api/filetype` ·
`/api/encrypt` · `/api/encryptionStatus` · `/api/rotatekey` · `/api/status/reset` ·
`/api/status/refresh` · `/api/swaggerjson`

- [ ] 🚨 **4.1a** As **A2**: `await probe('/api/rotatekey', 'POST')` → **`403`.**
      *(1.1j: returned `200`.)*
- [ ] 🚨 **4.1b** As **A2**: `await probe('/api/encrypt', 'POST')` → **`403`.** *(Also `200`
      before.)*
- [ ] **4.1c** As **A2**: `await probe('/api/accessgroups', 'POST', {})` → **`403`.**
- [ ] **4.1d** As **A2**: `await probe('/api/denylist/{id}', 'DELETE')` → **`403`.**
- [ ] **4.1e** As **A2**: `await probe('/api/status/reset', 'POST')` and
      `await probe('/api/status/refresh', 'POST')` → both **`403`.**
- [ ] **4.1f** As **A2**: `await probe('/api/swaggerjson')` → **`403`.** *(This, not the `/api-doc`
      page, is what actually protects the API documentation.)*
- [ ] 🔴 **4.1g** As **A1**: `await probe('/api/accessgroups')` → **works.** Reading and writing are
      separate permissions. **If this is `403`, read and write are wired backwards** — a serious
      error that would look fine everywhere else.
- [ ] **4.1h** Spot-check three more endpoints from the list: as **A1** they work; as **A3** they
      return **`403`.**

### 4.2 Group B — the Onboarding audience (3 endpoints)

**Expect: works for A1, A2, A3 and A4 · `403` for A5.**

`/api/allowedusers` · `/api/allowedusers/bydestination` · `/api/allowedusersaudit/{slug}`

- [ ] **4.2a** Mostly already covered — A5 by 3.5f–3.5i, the others by 3.1k / 3.2q / 3.3h / 3.4f.
      **Explicitly confirm A4 is not denied** — these carry no jurisdiction restriction.

### 4.3 Group C — change-request writes (3 endpoints, 6 actions)

| Endpoint | Action | A1 | A2 | A3 | A4 | A5 |
|---|---|---|---|---|---|---|
| `/api/changerequest` | create (POST) | ✓ | 403 | ✓ | 403 | 403 |
| `/api/changerequest` | reschedule (PUT) | ✓ | 403 | ✓ | 403 | 403 |
| `/api/changerequest` | cancel (DELETE) | ✓ | 403 | ✓ | 403 | 403 |
| `/api/changerequest/{slug}` | view (GET) | ✓ | ✓ | ✓ | ✓ | 403 |
| `/api/changerequest/{slug}` | cancel (DELETE) | ✓ | 403 | ✓ | 403 | 403 |
| `/api/changerequest/deploy/{slug}` | deploy (GET) | ✓ | 403 | 403 | 403 | 403 |

- [ ] **4.3a** Covered by 3.1j (A1), 3.2u–3.2w (A2), 3.3f–3.3g (A3), 3.4e (A4).
      ⚠️ **These endpoints had no permission check whatsoever before this change** — only a check
      that the destination was within your reach. A2 has global reach, so A2 could cancel or
      reschedule on **any** destination in the system.
- [ ] 🚨 **4.3b** As **A2**: `await probe('/api/changerequest/deploy/{id}')` → **`403`**, and an
      audit entry appears. *(1.1l: the call never finished at all.)*
- [ ] **4.3c** As **A1** and as **A3** — both may reschedule *and* cancel — open a scheduled change
      request and confirm **both** the **Reschedule** and **CANCEL REQUEST** buttons appear and
      **both still work.** *(These two buttons used to share a single permission and are now
      separate. No current role can tell the difference, so this is a no-regression check, not a
      denial check.)*

### 4.4 Group D — any signed-in user (4 endpoints)

`/api/destinations` · `/api/jurisdictions` · `/api/destinationuri/validate` ·
`/api/changerequeststatus/{id}`

- [ ] **4.4a** Each works normally, for **all five** accounts.
- [ ] **4.4b** In a **private window with no sign-in**, each **redirects to sign-in** — not a
      `403`. **No audit entry is written** either way. That is the point: not being signed in is
      not a permission failure.

### 4.5 Group E — public, no sign-in needed (2 endpoints)

- [ ] 🔴 **4.5a** In a **private window with no sign-in**, open `/api/healthcheck` and
      `/api/deephealthcheck` **in the address bar** → both return **`200`.** *(These two are the
      only `/api/...` URLs the address bar works for. If they break, the load balancer takes the
      whole service out of rotation — check them.)*

### 4.6 Group F — unchanged behaviour (13 endpoints)

All five `/api/apikeys/*` · **both `/api/apikeysaudit/*`** · `/api/destinations/{slug}` ·
`/api/destinationaudit/{slug}` · `/api/statushistory/{slug}` ·
`/api/tests/connectiontest/{slug}` · `/api/status/reset/{slug}` · `/api/elasticsearch/query`

> The two `apikeysaudit` endpoints are new — they arrived from another team's work while this
> change was being built. They decide permissions inside the endpoint, exactly like the five
> `apikeys` ones beside them, so **their behaviour is unchanged by this change** and they belong
> in this group. Test them as you would any Group F endpoint: identical to Part 1.

- [ ] 🔴 **4.6a** These must behave **exactly as they did in Part 1, for every account.** They were
      deliberately left alone. **Any difference here is a regression**, not an intended change.
      Covered by the normal workflow checks in each Part 3 session.
- [ ] **4.6b** Five of them still enforce jurisdiction: `destinations/{slug}`,
      `destinationaudit/{slug}`, `statushistory/{slug}`, `tests/connectiontest/{slug}`,
      `status/reset/{slug}`. As **A3**, request a destination **outside `ut`** → **`401`**
      (not `403` — see *Do not file these as bugs*).

### 4.7 The two one-offs

- [ ] 🔴 **4.7a** `await probe('/api/organizations')` → **works for A1, A2, A3 and A4 · `403` for
      A5.** A3 and A4 are jurisdiction-scoped and must still get through. **A `403` for A3 or A4
      would silently break Onboarding for both** — same underlying check as 3.4f.

**4.7b** `await probe('/api/maintenance/update/{slug}', 'POST')`:

| Account | Inside own jurisdiction | Outside own jurisdiction |
|---|---|---|
| A1 | works | works (global reach) |
| A3 | works | **`401`** |
| A2, A4, A5 | **`403`** | **`403`** |

- [ ] **4.7b** Run your account's row. Two different failures, two different codes: **`403`** means
      "your role may not do this", **`401`** means "not your jurisdiction". Confirm you can tell
      them apart.

### 4.8 Methods and removed endpoints — all as A1

- [ ] **4.8a** `await probe('/api/accessgroups', 'PATCH')` → **`405`**, and the response carries an
      **`Allow: GET, POST`** header. *(A method that is not offered is not permitted by omission.)*
- [ ] **4.8b** `await probe('/api/denylist', 'PUT')` → **`405`** + `Allow: GET, POST`.
- [ ] **4.8c** `await probe('/api/api-middleware-helper')` → **`404`.** *(1.1k: the call never
      finished, because the endpoint existed and its handler never replied. `404` proves it is
      gone.)*
- [ ] **4.8d** `await probe('/api/apikeys/lifecycle.test')` → **`404`.** *(Test files were being
      served as live endpoints. They have been moved out.)*

**That accounts for all 41 endpoints:** 14 + 3 + 3 + 4 + 2 + 13 + 2 = 41.

---

## Part 5 — The audit log

This proves criterion 2. Do it once, using denials you already produced. Search for
`eventType:AccessDenied`.

- [ ] 🔴 **5.1** **Exactly one entry per denied request.** Not zero, not two.
- [ ] **5.2** A **page** denial records `deniedAt: page`, which page, the method, who the user was,
      and **all** the roles they hold. The roles must match what you wrote down in **0.2d**.
- [ ] 🔴 **5.3** **The `url` field is the page the user tried to open** — `/accesscontrol`. If it
      reads something like `/_next/data/BUILD_ID/accesscontrol.json`, **report it.**
      ⚠️ **Use the denial from check 3.2l**, found by the time you noted at 3.2l-iv. Every other
      denial in this plan was reached by typing a URL, and those record the right value whether or
      not the change is correct — so they cannot tell you anything here.
- [ ] **5.4** The `permission` field names **both the page and the permission**, e.g.
      `accesscontrol.canViewAccessControl` — not `canViewAccessControl` on its own.
      *(Two permission names are used on more than one page, so the short form is ambiguous.)*
- [ ] **5.5** An **API** denial records `deniedAt: api` and the same two-part permission name.
- [ ] **5.5a** **The `/api/organizations` denial from check 3.5j is the one exception.** It has
      **no** `permission` field. Instead it carries **`permissionAnyOf`**, listing all three
      permissions that would each have allowed the call:
      `accesscontrol.canViewAccessControl`, `console.canViewConsole`, `onboarding.canViewOnboarding`.
      *(That endpoint accepts any one of three, so the caller failed all three and naming just one
      would tell whoever reads the log to grant the wrong thing. This is the only endpoint in the
      system that works this way.)*
- [ ] **5.6** Searching `eventType:AccessDenied AND deniedAt:page` returns page denials only.
- [ ] **5.7** The `sessionId` on a page denial **matches that same session's other log lines**, so
      one user's page and API denials can be traced together.
- [ ] 🔴 **5.8** **No entry at all when someone who is not signed in hits a gated page.** Open
      `/accesscontrol` in a private window → it redirects to sign-in silently, with **nothing** in
      the log. *(Otherwise every expired session would generate noise.)*
- [ ] **5.9** **Existing log searches still work.** `eventType:AccessDenied` still returns the
      API-key and destination-reach denials that existed before this change, unchanged.
- [ ] **5.10** For an API denial, the normal request log line still appears **before** the denial,
      so a denied request is still visible in the access log.

---

## Part 6 — End-to-end regression

**The developer runs these** against dev after deploy, unless you have the e2e environment set up
yourself. Record the result here either way.

- [ ] **6.1** `navbar.spec.ts`
- [ ] **6.2** `manageConnection.spec.ts` — exercises maintenance scheduling, which gained two
      checks
- [ ] ⚠️ **6.3** `cancelRescheduleCR.spec.ts` — **the highest-value one for this change.** It
      clicks Reschedule, the button whose permission wiring changed.
- [ ] ⚠️ **6.4** `deployChangeRequest.spec.ts` — the deploy check was rewired and its missing error
      response fixed
- [ ] **6.5** `onboarding.spec.ts` — the page and all three endpoints behind it gained checks.
      ⚠️ **This one also proves something no manual check covers:** it asserts the sender table has
      rows, and that data is loaded by the server rather than the browser. If it passes, the
      server-side load works. If the Onboarding page ever shows *"Failed to load onboarding
      data"* with an empty table, **that is not a permission problem** — the permission check
      already passed to get that far. Report it separately.

> ⚠️ **All five depend on the e2e account being an `IZG Operations` account.** If it is not, they
> fail for the right reason and look like a regression. **Confirm that first** — and note they must
> already pass today for the suite to be green.

---

## Sign-off

| Covers | Part | Result | Tester | Date | Notes |
|---|---|---|---|---|---|
| Setup and accounts verified | 0 | | | | |
| 🔴 **"Before" state recorded, pre-deploy** | **1** | | | | |
| No regression for IZG Operations | 3.1 | | | | |
| 🚦 **RELEASE GATE — IZG Support** | **3.2** | | | | |
| The narrowed endpoint still works | 3.3 | | | | |
| Jurisdiction Support reaches Onboarding | 3.4 | | | | |
| 🚨 **The open write endpoint is closed** | **3.5** | | | | |
| All 41 API endpoints | 4 | | | | |
| Audit log | 5 | | | | |
| End-to-end regression | 6 | | | | |

### 🛑 Stop the release if any of these happen

1. **Anything in 3.1 fails.** IZG Operations must see zero change. A failure there means a
   permission is wired wrong — and the same wrongness is silently denying other roles too.
2. **A2 is blocked from something you recorded in 1.1n as normal work.** That is a wrong permission
   value. It must be fixed and re-tested, not waived. The fix is one line.
3. **A denial moves the user instead of showing a message**, on any page in the 2.2 table.
   Criterion 1 is not met.
4. **Two audit entries, or none, for a single denial.** Criterion 2 is not met.
5. **3.5f still succeeds** — `POST /api/allowedusers` for A5. The headline hole is still open.
6. **Any Group F endpoint (4.6) behaves differently from Part 1.** Those were meant to be
   untouched; a difference means something unintended changed.
7. **3.4f fails** — Jurisdiction Support cannot load the Onboarding organisation list. Two roles
   have lost Onboarding.

### ✅ Do not file these as bugs

| What you will see | Why it is expected |
|---|---|
| `/api-doc` denial writes **no** audit entry | That page is protected differently from the others, by design. It does now show a message instead of a blank page. What actually protects the documentation is `/api/swaggerjson`, checked in 4.1f. |
| **IZG Support denied `/adminoperations` and `/console`** | Intentional and temporary. The agreed future role model grants both; that grant is a separate ticket, held back so this change only removes access. |
| **IZG Support and Jurisdiction Support lose change-request create / reschedule / cancel** | Intentional. The buttons were already hidden for both roles — what is removed is the ability to do it by direct API call. **Nobody should notice in normal use.** If someone does, a permission value is wrong. |
| **Sender Operations loses `/onboarding`** | Intentional. That role was never meant to have it. |
| Jurisdiction failures return **`401`** where permission failures return **`403`** | `403` would be more correct. Changing it can affect client retry behaviour, so it is deliberately left to its own ticket. |
| `/edit`, `/history`, `/test`, `/changerequest`, `/testreport` still open for any signed-in user | Deliberately out of scope. Gating them removes access from people who have it today, which is a product decision, not a bug fix. |
| Four automated test suites failing to start (database and encryption ones) | Pre-existing environment problem, unrelated to this change. No test *fails* — these four cannot start at all. |
| Two `@swagger` warnings during the build | Pre-existing malformed comments, untouched by this change. |
| `/api/swaggerjson` returning an empty specification | Separate pre-existing bug. |
| Denials on the **hub circuit-breaker reset** and **hub database refresh** now log the reason `insufficient role for route access` instead of `admin-only operation` | Intentional. Both endpoints kept their old admin check as a second layer, but the new permission check runs first, so it is the one that reports. Who can call them is **unchanged**. ⚠️ **Tell whoever owns the log dashboards** — a saved search on `reason:"admin-only operation"` will go quiet. |
