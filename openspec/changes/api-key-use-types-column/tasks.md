# Tasks

**The UI review is authoritative.** mattystank's commits `7d1f70e` and `55275da` (PR #711,
2026-10-05/06) changed the page after these tasks were written. The tasks below now describe
his UI. Do not change it during apply. Adapt tests to it instead.

Scope settled by the team on 2026-09-30 and completed by the product owner on 2026-10-01:
the grid column, a read-only field on the Renew dialog, a fourth filter dropdown, and a
use-type match in the search box. The Re-issue dialog already displays use types and needs no
code. The one-time token reveal dialog does not change. Nothing is outstanding.

## 1. Preconditions

- [x] 1.1 Set up a local run target for the e2e spec. `playwright.config.ts:13` reads
  `baseURL` from `process.env.BASE_URL` and defines no `webServer`, so the suite runs against
  whatever URL that variable names. Start the app with
  `FEATURE_API_KEY_MANAGEMENT_ENABLED=true`, then verify by running the spec with
  `BASE_URL=<local url>` and seeing it reach the app.

  **Done 2026-10-07.** The app runs on port 80, so the run command is
  `BASE_URL=http://localhost npx playwright test e2e/tests/apikeys.spec.ts --project=Chrome
  --retries=0`. Credentials come from `.env.test`, which `playwright.env.setup.ts` loads.
  The run reached the app and reached Okta.

  **Blocked on a stale credential.** Okta rejected `cc_test_automation@izgateway.org` at the
  password step with "Unable to sign in". Update `OKTA_PASSWORD` in `.env.test` and unlock
  the account before the run. Pass `--retries=0`: the config retries twice, and repeated
  rejections can lock the account.

  **The e2e spec is verified locally, before merge.** It cannot pass against a deployed
  environment until this change deploys there, because it asserts UI that does not exist yet.
  Group 6 therefore does not wait on a deployed run.

- [x] 1.2 Confirm the local data holds what the tests need: at least one key that carries a
  use type, and at least one **Active** key. Verify by reading the USE TYPES and STATUS
  columns at 100 rows per page.

  **Verified 2026-10-07.** 88 keys, 40 Active. Rows carry Patient, Provider or Public
  Health, several carry two, and several carry none.

  **An organization's allowed use types are live data, not repo data.** They live on the
  Jurisdiction row in DynamoDB, in the `useTypes` field, read at `src/lib/db/dynamo.ts:209`.
  The Create dialog narrows the picker to that set (`index.tsx:3041`). Audacious Inquiry
  permits Provider and Public Health. Utah permits Public Health. **No organization permits
  all three**, so a key with three use types cannot exist without a database edit. The e2e
  assertion for three use types was dropped rather than faked.

  Note for the record: Paul Cahill's IGDD-3184 comment states that
  `FEATURE_API_KEY_MANAGEMENT_ENABLED` shipped **off** for release 1.18.0. Confirm the
  deployed value with Paul before anyone expects the e2e spec to run in CI against a
  deployed environment.

## 2. The shared helper

- [x] 2.1 Add one helper to `src/components/ApiKeyManagement/index.tsx` that takes an `ApiKey`
  row and returns its use types as `AllowedUseType[]`, filtered by membership in
  `ALLOWED_USE_TYPES`. This gives canonical order and drops any stored value outside the
  enumeration. Every surface in tasks 3 and 4 MUST call it, so no two surfaces can disagree
  about the same row. Verify by a row whose `useTypes` holds an unrecognized value: no
  surface shows it.

- [x] 2.2 Add a second helper, or an option on the first, that returns the canonical-order
  **labels** joined by `", "`, and the em dash when the row carries none. The grid's
  `valueGetter` and all three dialog fields use it. Verify by a unit check of three inputs —
  two values, three values, and none — read against `USE_TYPE_LABELS`.

## 3. The USE TYPES column

- [x] 3.1 Add a `UseTypesCell` component beside `StatusCell`. It calls the task 2.1 helper,
  maps each value through `USE_TYPE_LABELS`, and renders "None" when the result is empty
  (the UI review changed this from an em dash; the sort key keeps the em dash).
  Verify by rendering the page and comparing three rows — one use type, two, and none —
  against their `useTypes` values in the API response.

- [x] 3.2 Render the first two labels as `Chip` elements with `size="small"`, the
  `SearchableMultiSelect` `chipColor="primary"` palette (`#e3f2fd` background,
  `palette.primary` text and 1px border) and `fontSize: '0.875rem'`. Verify by opening the
  Create dialog beside the grid and confirming that the same use type looks the same in both.

- [x] 3.3 Render a "+N more" chip only when two or more use types would be hidden (UI
  review rule). It follows the first two chips and carries a `Tooltip` whose title lists
  every label. It is focusable, so `Tab` opens the tooltip. With three use types in the
  enumeration no credential reaches it, so it cannot be observed today. Verify by reading
  the code: `shown` is the first two only when `length - 2 >= 2`.

- [x] 3.4 Insert the column into the `columns` array (`index.tsx:3190`) **between the `domain`
  and `status` entries**, with `field: 'useTypes'`, `headerName: 'USE TYPES'`, `flex: 1.5`,
  `minWidth: 170`, `sortable: true`, `filterable: false`, and `renderCell` returning
  `<UseTypesCell />`. The `valueGetter` is the task 2.2 helper. **For a row with no use types
  it returns the em dash, not an empty string** — that gives every such row one shared sort
  key, so they group together instead of scattering (`design.md` Decision 6). They group at
  the start in ascending order, because the platform collation places punctuation before
  letters. Verify by loading the grid at 1344px or wider and confirming
  the header order reads DESCRIPTION, ENVIRONMENT, ORGANIZATION, DNS, USE TYPES, STATUS,
  DURATION, CREATED BY, ACTION. (The UI review merged CREATED and EXPIRES into DURATION.)

- [x] 3.5 Confirm the column sorts. Verify by clicking the USE TYPES header twice and
  checking that rows group by first label ascending, then descending, and that rows with no
  use types group together rather than scatter.

  **Verified 2026-10-07, at 100 rows per page against 88 rows.** The first click groups the
  "None" rows at the top. The second click reverses the order and puts Public Health rows
  first. **This corrected the design.** The earlier draft claimed the em dash sorts after
  every letter, so empty rows would land last ascending. The platform collation places
  punctuation before letters, so they land first. `design.md` Decision 6 and the delta
  spec scenario were corrected to require a predictable group position, not the last
  position. No code changed.

- [x] 3.6 Settle the chip width question with the UI reviewer, then implement their choice.
  **Resolved by the UI review (`55275da`, 2026-10-06):** chips wrap inside the cell and
  every row is auto-height, so no chip clips. Verify by a row carrying Provider and Public
  Health rendering both values in full at a 1344px viewport, the narrowest at which the grid
  shows.

- [x] 3.7 Confirm the card view shows use types. Below 1344px each key is a card with a
  "Use Types:" label and the same `UseTypesCell`. Verify by narrowing the window below
  1344px and reading the same chips on the card as in the grid row, and by confirming that
  the filter and the search narrow the cards.

  **Verified 2026-10-07 at 1342px.** Each card carries a "Use Types:" row with the same
  chip as the grid. The Use Types filter narrowed 88 cards to 49 and the badge read 1.
  A search for "Public Health" narrowed the cards to the same 49.

## 4. The dialog fields

- [x] 4.1 Add a read-only `PolicyField label="Use Types"` to `RenewDialog`
  (`index.tsx:1306`), after the Jurisdiction + Environment row and before Description, with
  the value from the task 2.2 helper. Match `ReissueDialog` (`index.tsx:1652`) exactly — same
  component, same label, same position. Verify by opening Renew on an Active key with two use
  types and reading both labels, with no control that changes them.

- [x] 4.2 Confirm `ReissueDialog` needs no change. Verify by opening Re-issue on an Expired
  key and reading the existing Use Types field, then confirming that the diff does not touch
  `ReissueDialog`.

  **Corrected by `/opsx:verify`, 2026-10-07.** The existing field mapped the stored array
  in stored order (`useTypes.map(... ?? u)`), so it broke the spec scenario "Every surface
  uses the same labels and the same order" and task 2.1's rule that every surface calls the
  helper. Its value now comes from `formatUseTypes`. Field, label and position are unchanged.

- [x] 4.3 Confirm `KeyCreatedDialog` is unchanged. Verify by revealing a token and seeing
  only the key expiry and the token string, and by confirming the diff does not touch that
  component.

- [x] 4.4 Add `e2e/tests/apikeys.spec.ts` — the first Playwright coverage for `/apikeys`. Use
  `e2e/helpers/oktaLogin.ts` for login. Build the context with a 1680×1050 viewport: the
  config's 1280px shows cards and no grid, and below 1600px "Renew key" is inside the
  "More Options" menu. A `browser.newContext()` context ignores `test.use()`, so set the
  viewport on the context. Set the page size to 100 rows, or the suite reads 5 of ~90 rows.

  **The suite runs against a shared dev environment whose data changes without notice.**
  No test MUST look for a row of a given shape. Each test reads the page and derives its
  expectation, or skips with a stated reason. Assert:

  1. the header order of task 3.4, with `USE TYPES` between `DNS` and `STATUS`
  2. at least one cell renders a chip
  3. every chip label is Patient, Provider or Public Health, in canonical order per cell
  4. a cell with no chips reads "None"
  5. the Renew dialog on an Active key shows a read-only Use Types field whose value equals
     that row's chips joined by ", " — an em dash for a key with none

  Verify by running `BASE_URL=http://localhost npx playwright test e2e/tests/apikeys.spec.ts
  --project=Chrome --retries=0` against the local server from task 1.1, and seeing it pass.

  **Rewritten and verified 2026-10-07.** The earlier draft hunted for a two-use-type row
  and a three-use-type row. Task 1.2 established that no organization permits all three, so
  that test could only ever skip. It was dropped. All 11 tests pass against the local app on
  port 80, with no skips. It passes Prettier, ESLint and `tsc --noEmit`.

  **One test bug was fixed during the run.** `.MuiPopover-paper` matched two elements while
  a Select dropdown was open, because a MUI Select renders its own dropdown as a popover
  carrying the extra class `MuiMenu-paper`. Playwright rejected the ambiguous locator before
  judging visibility. The helper now excludes that class, and a new `chooseFilterOption`
  waits for the dropdown to leave the DOM before anything touches the popover behind it.
  No application code changed.

- [x] 4.5 Cover the column chooser in the same spec. The toolbar's **Columns** button opens a
  popover listing every hideable column with a checkbox, plus a **Default view** button
  (`index.tsx:1399`). Assert that the popover lists `USE TYPES` with its box checked, that
  unchecking it removes the column header, and that **Default view** restores it.
  `DEFAULT_KEYS_COLUMN_VISIBILITY_MODEL` is empty (`index.tsx:624`), so every column is
  visible in the default view. Nothing persists the model, so the state resets on reload.
  Verify by the same local run as task 4.4. **Verified 2026-10-07; both tests pass.**

## 5. Narrowing the list

- [x] 5.1 Add `useType: string` to the `ApiKeyFilters` interface and `useType: ''` to
  `EMPTY_FILTERS`. Verify by `tsc --noEmit` passing, which it will only do once every reader
  of that type handles the new key.

- [x] 5.2 Add a fourth `renderFilterSelect('Use Types', 'useType', useTypeFilterOptions)`
  call after the Organization dropdown (`index.tsx:1022`), with options built from
  `ALLOWED_USE_TYPES` as values and `USE_TYPE_LABELS` as labels. Verify by opening the filter
  popover and seeing four dropdowns with Patient, Provider and Public Health in the fourth.

- [x] 5.3 Add the `useType` term to `activeFilterCount` beside the existing three. Verify by
  setting only the use-type filter and seeing the badge read 1, then by pressing **Clear all**
  and seeing the dropdown reset with the badge gone.

- [x] 5.4 Add the filter clause to `filteredRows` (`index.tsx:2917`): a row matches when no
  use-type filter is set, or when `row.useTypes` **contains** the selected value. Verify by
  filtering to Patient and confirming that a Patient-only key and a Patient + Provider key
  both appear, and a Provider-only key does not.

- [x] 5.5 Add the search clause to the same `matchesSearch` expression: test the term against
  the task 2.2 joined label string, lower-cased. Verify by typing "public health" and seeing
  only keys carrying Public Health, and by confirming that typing `PUBLIC_HEALTH` matches
  nothing.

- [x] 5.6 Extend `e2e/tests/apikeys.spec.ts` from task 4.4 to cover the filter, the badge and
  the search. Read the label off the page first, then act on it. Assert:

  1. the Filters popover lists four dropdowns — Environment, Status, Organization, Use Types
  2. filtering to the read label leaves every remaining cell carrying that label
  3. the badge reads 1, and **Clear all** clears it
  4. searching the label narrows the list, keeps it non-empty, and still finds the key the
     label was read from
  5. searching `PUBLIC_HEALTH` matches nothing

  **Assertion 4 does not require every matched row to carry the label.** The search also
  matches the description, the DNS name, the jurisdiction and the environment, so a
  description holding the word "patient" would match without a Patient use type.

  Verify by running the spec against the local server and seeing it pass. **Rewritten and
  verified 2026-10-07; all four filter and search tests pass.**

## 6. Documentation and integration

- [x] 6.1 Update §3 of the *IZGateway API Key Management — Operations Manual* (Confluence page
  960888833). Its column list reads "Description …, Environment, Organization, DNS, Status,
  Created, Expires, Created By, Action". It must name USE TYPES in its grid position, and
  DURATION in place of Created and Expires. Add one sentence stating that below 1344px the
  page shows one card per key. Verify by re-reading §3 against the shipped grid. Confirm the edit with the
  page owner before posting — the page is shared and marked DRAFT.

  Update the same section's **Search** and **Filters** sentences. Search reads "matches key
  ID, description, jurisdiction, DNS name, or environment" and must add use types. Filters
  reads "Environment, Status, Organization" and must add Use Types.

  **Done 2026-10-07**, page version 22. The page owner is the author of this change, so no
  separate agreement was needed. Four edits landed: the column list now reads Use Types and
  Duration in place of Status, Created and Expires; Search names use types and states that
  the stored value does not match; Filters names Use Types and states that it matches on
  membership; one new paragraph describes the card view below 1344 pixels.

- [x] 6.2 Update §7 of that page, step 3. It reads "Use types carry over automatically",
  which stays true and is now visible on the dialog. Verify by the step naming the new
  read-only field, so an operator knows to check it before renewing.

  **Done 2026-10-07**, page version 23. Step 3 now names the read-only **Use Types** field
  and tells the operator to read it before renewing.

  **Side effect of the edit tool, not yet fixed.** `confluence_update_page_section` reset
  the page layout from full width to fixed width. The MCP tools cannot set that property.
  Set it back in the Confluence editor under the page width control.

- [x] 6.3 Replace the keys-screen screenshot in §3 of that page
  (`image-20260817-171917.png`), which shows the nine-column grid, and the Renew dialog
  screenshot in §7 (`image-20260818-153743.png`). Verify by both images showing the new
  fields.

  **Done 2026-10-07 by the change author**, together with the page width, which the
  section-edit tool had reset to fixed.

- [x] 6.4 Run `npm run code-quality-check` and verify that lint and `tsc --noEmit` both pass.
  `no-explicit-any` and `no-unused-vars` are errors in this repo, not warnings.

- [x] 6.5 Check the layout at its breakpoints. At 1344px the grid shows, with no column
  clipping its header and the use-type chips wrapping rather than clipping. Just below
  1344px the page shows cards. Below 1600px the row actions are one "More Options" button;
  at 1600px and wider they are the full strip. Verify each by resizing the window.

  **Verified 2026-10-07.** At 1680px and at 1600px the actions are the full button strip.
  At 1599px they collapse to one "More Options" button. At 1344px the grid shows, every
  header reads in full, and a row carrying Provider and Public Health stacks both chips on
  an auto-height row. At 1342px the page shows one card per key.

- [x] 6.6 Write the manual re-test table as a comment on IGDD-3460, in the format Paul Cahill
  used on IGDD-3184 (test ref, what to do, expected result). Cover every scenario in
  `specs/api-key-credential-lifecycle/spec.md` — the grid, the Renew dialog, the Re-issue
  dialog, the token reveal, the filter and the search. Verify by the comment appearing on the
  ticket, ready for the tester to fill in the result column.

  **Posted 2026-10-07**, comment id `116883`. 18 rows, UT-01 to UT-18. They cover every
  scenario in the delta spec, plus the card view, the actions menu and the Columns popover.
  UT-03 is marked blocked in the table itself: no organization permits all three use types,
  so a key carrying all three cannot exist without a database edit.

- [x] 6.7 Confirm the branch dependency has landed before archiving.
  `openspec/specs/api-key-credential-lifecycle/spec.md` exists only on branch
  `openspec-cleanup`, which is not yet an ancestor of `develop`, so this delta currently
  targets a capability that is absent here. The merge is planned and confirmed; only the
  ordering matters. Verify by `openspec list --specs` reporting `api-key-credential-lifecycle`.
  See `proposal.md` — Branch dependency. **Landed:** `5efc9bb` ("OpenSpec Archive (#705)")
  brought the spec to `develop`, and `openspec list --specs` reports it on this branch.

- [x] 6.8 Once the main spec is present, add a `MODIFIED` block to the delta for the
  requirement "The credential list is returned whole and filtered client-side". Its scenario
  "Filters compose with the text search" names environment, status and organization, and must
  name use types too. Copy the whole requirement body, as a partial `MODIFIED` loses detail at
  archive time. Verify by `openspec validate --strict` passing with the block in place.

- [x] 6.9 Run `openspec validate "api-key-use-types-column" --strict` and verify it reports
  the change as valid.

## Verification status — 2026-10-07

Checkboxes above track **implementation**. All code is written.
`npm run code-quality-check` passes with exit 0 and no warnings from the edited files.
All 31 tasks are complete.

### What manual testing confirmed

- **Column position.** The header row reads DESCRIPTION, ENVIRONMENT, ORGANIZATION, DNS,
  USE TYPES, STATUS, DURATION, CREATED BY, ACTION — exactly as task 3.4 specifies. The UI
  review merged CREATED and EXPIRES into DURATION.
- **Chips render, and match the Create picker.** Same blue outline treatment.
- **Chips wrap, and no chip clips.** Verified at 1344px on a row carrying Provider and
  Public Health. The row grows to fit them. This closed task 3.6.
- **Sorting works, and it corrected the design.** See task 3.5.
- **The card view carries use types**, and the filter and the search narrow the cards.
  Verified at 1342px.
- **The breakpoints are where the tasks say.** The full action strip at 1600px and wider,
  one More Options button at 1599px, the grid at 1344px, cards below it.

### What the data cannot show

- **An organization's permitted use types are live DynamoDB data.** They sit on the
  Jurisdiction row in the `useTypes` field. Audacious Inquiry permits Provider and Public
  Health. Utah permits Public Health. **No organization permits all three.**
- **A key with three use types cannot exist** without a database edit. The e2e assertion
  for three use types was therefore dropped, and the Jira re-test table records UT-03 as
  blocked.
- **The "+N more" indicator and its tooltip** (3.3) cannot run for the same reason.

### UI review — 2026-10-07

mattystank's commits `7d1f70e` and `55275da` were merged in PR #711. They resolved task 3.6
(chips wrap, rows are auto-height) and changed the empty cell to "None", the overflow rule,
the column set (DURATION) and the layout (cards below 1344px, an actions menu below 1600px,
a Columns popover). The proposal, design, delta spec and tasks were revised to match. The
code was not changed. Everything that review left open is now closed.

### The e2e run

**All 11 tests pass, 2026-10-07**, against the local app on port 80, one browser, no
retries, no skips:

```
BASE_URL=http://localhost npx playwright test e2e/tests/apikeys.spec.ts --project=Chrome --retries=0
```

The stale `OKTA_PASSWORD` in `.env.test` blocked the first attempt. The change author
updated it. Pass `--retries=0`: the config retries twice, and repeated Okta rejections can
lock the account.

**Do not dispatch `playwright-nightly.yml` against the deployed dev environment until this
branch merges.** It points `BASE_URL` at dev, and the feature commit `8139a98` is not on
`develop`, so the new tests would fail on a column that is not deployed there.

### Archive gating

6.7, 6.8 and 6.9 are done. Strict validate passed again on 2026-10-07 after the sort
correction. Re-run 6.9 before archiving if the delta changes again.

### Notes on the implementation

One edit was made beyond the task list. `noRowsMessage` enumerates the active filters
explicitly to decide its wording (`index.tsx`, `hasOtherFilters`). Without the new `useType`
term it would report "No API keys for <org>." while a use-type filter was also narrowing the
list, which states something untrue about that organization. Added under task 5.3.

The grid is `@mui/x-data-grid` **v7**, not v5 as the Context section first recorded. In v7
`valueGetter` takes `(value, row, column, apiRef)` rather than a params object. The code uses
the v7 signature, checked against the installed type declaration.

`npm run build` fails in the local environment, at the page-data collection step for
`/test/[...slug]` and `src/pages/api/statushistory/[...slug].ts`. That is unrelated to this
change: compilation succeeds, TypeScript passes, neither route imports `ApiKeyManagement`, and
the failing code reads mTLS certificate paths the local environment has no credentials for.
