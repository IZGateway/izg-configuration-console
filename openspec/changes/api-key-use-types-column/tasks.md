# Tasks

**The UI review is authoritative.** mattystank's commits `7d1f70e` and `55275da` (PR #711,
2026-10-05/06) changed the page after these tasks were written. The tasks below now describe
his UI. Do not change it during apply. Adapt tests to it instead.

Scope settled by the team on 2026-09-30 and completed by the product owner on 2026-10-01:
the grid column, a read-only field on the Renew dialog, a fourth filter dropdown, and a
use-type match in the search box. The Re-issue dialog already displays use types and needs no
code. The one-time token reveal dialog does not change. Nothing is outstanding.

## 1. Preconditions

- [ ] 1.1 Set up a local run target for the e2e spec. `playwright.config.ts:13` reads
  `baseURL` from `process.env.BASE_URL` and defines no `webServer`, so the suite runs against
  whatever URL that variable names. Start `npm run dev` with
  `FEATURE_API_KEY_MANAGEMENT_ENABLED=true`, then verify by running an existing spec with
  `BASE_URL=http://localhost:3000` and seeing it reach the app.

  **The e2e spec is verified locally, before merge.** It cannot pass against a deployed
  environment until this change deploys there, because it asserts UI that does not exist yet.
  Group 6 therefore does not wait on a deployed run.

- [ ] 1.2 Confirm the local data holds the rows the tests need: an **Active** key with two
  use types, an **Active** key with all three, and an **Expired** key. Verify by reading the
  `status` and `useTypes` values in the `GET /api/apikeys` response. Where a row is missing,
  create it through the Create dialog.

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
  it returns the em dash, not an empty string** — MUI's default string comparator sorts an
  empty string before every letter, which would put those rows first ascending instead of
  last (`design.md` Decision 6). Verify by loading the grid at 1344px or wider and confirming
  the header order reads DESCRIPTION, ENVIRONMENT, ORGANIZATION, DNS, USE TYPES, STATUS,
  DURATION, CREATED BY, ACTION. (The UI review merged CREATED and EXPIRES into DURATION.)

- [ ] 3.5 Confirm the column sorts. Verify by clicking the USE TYPES header twice and
  checking that rows group by first label ascending, then descending, and that a row with no
  use types lands last ascending rather than at a random position.

- [x] 3.6 Settle the chip width question with the UI reviewer, then implement their choice.
  **Resolved by the UI review (`55275da`, 2026-10-06):** chips wrap inside the cell and
  every row is auto-height, so no chip clips. Verify by a row carrying Provider and Public
  Health rendering both values in full at a 1344px viewport, the narrowest at which the grid
  shows.

- [ ] 3.7 Confirm the card view shows use types. Below 1344px each key is a card with a
  "Use Types:" label and the same `UseTypesCell`. Verify by narrowing the window below
  1344px and reading the same chips on the card as in the grid row, and by confirming that
  the filter and the search narrow the cards.

## 4. The dialog fields

- [x] 4.1 Add a read-only `PolicyField label="Use Types"` to `RenewDialog`
  (`index.tsx:1306`), after the Jurisdiction + Environment row and before Description, with
  the value from the task 2.2 helper. Match `ReissueDialog` (`index.tsx:1652`) exactly — same
  component, same label, same position. Verify by opening Renew on an Active key with two use
  types and reading both labels, with no control that changes them.

- [x] 4.2 Confirm `ReissueDialog` needs no change. Verify by opening Re-issue on an Expired
  key and reading the existing Use Types field, then confirming that the diff does not touch
  `ReissueDialog`.

- [x] 4.3 Confirm `KeyCreatedDialog` is unchanged. Verify by revealing a token and seeing
  only the key expiry and the token string, and by confirming the diff does not touch that
  component.

- [ ] 4.4 Add `e2e/tests/apikeys.spec.ts` — the first Playwright coverage for `/apikeys`. Use
  `e2e/helpers/oktaLogin.ts` for login. **Set a viewport of at least 1600px wide in the spec**
  (`test.use({ viewport: ... })`): the config's 1280px shows cards and no grid, and below
  1600px "Renew key" is inside the "More Options" menu. Assert that the `USE TYPES` header
  sits between `DNS` and `STATUS` in the header order of task 3.4, that a two-use-type row
  renders both labels, that a three-use-type row renders all three labels and no "+N more"
  chip, and that the Renew dialog on an Active key shows a read-only Use Types field. Verify
  by running `BASE_URL=http://localhost:3000 npx playwright test e2e/tests/apikeys.spec.ts`
  against the local server from task 1.1, and seeing it pass.

  **Code updated 2026-10-07; run pending.** The spec now sets a 1680×1050 viewport on its
  own context (a `browser.newContext()` context ignores `test.use()`), drops `expires` from
  the header list, expects three chips and no "+N" on a three-use-type row, and requires the
  Renew field to equal the chips joined by ", " (an em dash for a key with none). It passes
  lint, Prettier and `tsc`. The Playwright run happens on another machine.

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

- [ ] 5.6 Extend `e2e/tests/apikeys.spec.ts` from task 4.4 to cover both. Assert that
  filtering to one use type keeps a multi-use-type key in the list, and that a search for a
  label narrows the rows. Verify by running the spec against the local server and seeing it
  pass. **Code present; its selectors still match the UI review at the 4.4 viewport. Run
  pending, on another machine.**

## 6. Documentation and integration

- [ ] 6.1 Update §3 of the *IZGateway API Key Management — Operations Manual* (Confluence page
  960888833). Its column list reads "Description …, Environment, Organization, DNS, Status,
  Created, Expires, Created By, Action". It must name USE TYPES in its grid position, and
  DURATION in place of Created and Expires. Add one sentence stating that below 1344px the
  page shows one card per key. Verify by re-reading §3 against the shipped grid. Confirm the edit with the
  page owner before posting — the page is shared and marked DRAFT.

  Update the same section's **Search** and **Filters** sentences. Search reads "matches key
  ID, description, jurisdiction, DNS name, or environment" and must add use types. Filters
  reads "Environment, Status, Organization" and must add Use Types.

- [ ] 6.2 Update §7 of that page, step 3. It reads "Use types carry over automatically",
  which stays true and is now visible on the dialog. Verify by the step naming the new
  read-only field, so an operator knows to check it before renewing.

- [ ] 6.3 Replace the keys-screen screenshot in §3 of that page
  (`image-20260817-171917.png`), which shows the nine-column grid, and the Renew dialog
  screenshot in §7 (`image-20260818-153743.png`). Verify by both images showing the new
  fields.

- [x] 6.4 Run `npm run code-quality-check` and verify that lint and `tsc --noEmit` both pass.
  `no-explicit-any` and `no-unused-vars` are errors in this repo, not warnings.

- [ ] 6.5 Check the layout at its breakpoints. At 1344px the grid shows, with no column
  clipping its header and the use-type chips wrapping rather than clipping. Just below
  1344px the page shows cards. Below 1600px the row actions are one "More Options" button;
  at 1600px and wider they are the full strip. Verify each by resizing the window.

- [ ] 6.6 Write the manual re-test table as a comment on IGDD-3460, in the format Paul Cahill
  used on IGDD-3184 (test ref, what to do, expected result). Cover every scenario in
  `specs/api-key-credential-lifecycle/spec.md` — the grid, the Renew dialog, the Re-issue
  dialog, the token reveal, the filter and the search. Verify by the comment appearing on the
  ticket, ready for the tester to fill in the result column. **Table drafted 2026-10-07
  (UT-01 to UT-16, which also cover the card view, the actions menu and the Columns
  popover). It still needs to be posted to the ticket.**

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

## Verification status — 2026-10-01

Checkboxes above track **implementation**. All code is written.
`npm run code-quality-check` passes with exit 0 and no warnings from the edited files.

### What manual testing confirmed

- **Column position.** The header row reads DESCRIPTION, ENVIRONMENT, ORGANIZATION, DNS,
  USE TYPES, STATUS, CREATED, EXPIRES, CREATED BY, ACTION — exactly as task 3.4 specifies.
- **Chips render, and match the Create picker.** Same blue outline treatment.

### What manual testing found wrong

- **A second chip clips** (task 3.6, new). This is the one defect, and it is a width problem
  across the whole grid rather than a fault in the cell. The column stays as written until the
  UI reviewer decides. `design.md` — Open Questions carries the numbers and the options.

### What is implemented but not yet observed

- **The "+N more" indicator and its tooltip** (3.3). Under the UI review's rule no credential
  can reach it while there are three use types, so this path cannot run today.
- **"None" for a key with no use types** (3.1). Every key in the test environment carries
  at least one.
- **Sorting** (3.5), the **filter** and the **search** (5.4, 5.5). Code complete, not yet
  exercised by hand.

### UI review — 2026-10-07

mattystank's commits `7d1f70e` and `55275da` were merged in PR #711. They resolved task 3.6
(chips wrap, rows are auto-height) and changed the empty cell to "None", the overflow rule,
the column set (DURATION) and the layout (cards below 1344px, an actions menu below 1600px,
a Columns popover). The proposal, design, delta spec and tasks were revised to match. The
code was not changed. Still open from that review: tasks 3.7 and 6.5, and the e2e spec
update in 4.4.

### What remains blocked or waiting

- **Playwright run (4.4, 5.6).** `e2e/tests/apikeys.spec.ts` is written, compiles and lints. It
  cannot run until the Playwright environment setup lands. It discovers suitable rows from live
  data and skips with a stated reason where none fits, so a data gap will not read as a defect.
- **Documentation (6.1, 6.2, 6.3).** Confluence page 960888833 is shared and marked DRAFT. It
  needs the page owner's agreement. Task 3.6 is now settled, so the column's final look is
  known.
- **Jira re-test table (6.6).** Written after task 3.6 and a full manual pass.
- **Archive gating.** 6.7, 6.8 and 6.9 are done (strict validate passed 2026-10-07). Re-run
  6.9 before archiving if the delta changes again.

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
