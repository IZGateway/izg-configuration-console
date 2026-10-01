# Tasks

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

- [ ] 2.1 Add one helper to `src/components/ApiKeyManagement/index.tsx` that takes an `ApiKey`
  row and returns its use types as `AllowedUseType[]`, filtered by membership in
  `ALLOWED_USE_TYPES`. This gives canonical order and drops any stored value outside the
  enumeration. Every surface in tasks 3 and 4 MUST call it, so no two surfaces can disagree
  about the same row. Verify by a row whose `useTypes` holds an unrecognized value: no
  surface shows it.

- [ ] 2.2 Add a second helper, or an option on the first, that returns the canonical-order
  **labels** joined by `", "`, and the em dash when the row carries none. The grid's
  `valueGetter` and all three dialog fields use it. Verify by a unit check of three inputs —
  two values, three values, and none — read against `USE_TYPE_LABELS`.

## 3. The USE TYPES column

- [ ] 3.1 Add a `UseTypesCell` component beside `StatusCell`. It calls the task 2.1 helper,
  maps each value through `USE_TYPE_LABELS`, and renders an em dash when the result is empty.
  Verify by rendering the page and comparing three rows — one use type, two, and none —
  against their `useTypes` values in the API response.

- [ ] 3.2 Render the first two labels as `Chip` elements with `size="small"`, the
  `SearchableMultiSelect` `chipColor="primary"` palette (`#e3f2fd` background,
  `palette.primary` text and 1px border) and `fontSize: '0.875rem'`. Verify by opening the
  Create dialog beside the grid and confirming that the same use type looks the same in both.

- [ ] 3.3 Render a `+N` indicator after the second chip when the row carries more than two
  use types, wrapped in a `Tooltip` whose title lists every label. Make the indicator
  focusable, so `Tab` opens the tooltip — a hover-only disclosure is unreachable by keyboard.
  Verify by tabbing to the indicator with no mouse and reading the full list.

- [ ] 3.4 Insert the column into the `columns` array (`index.tsx:3190`) **between the `domain`
  and `status` entries**, with `field: 'useTypes'`, `headerName: 'USE TYPES'`, `flex: 1.5`,
  `minWidth: 170`, `sortable: true`, `filterable: false`, and `renderCell` returning
  `<UseTypesCell />`. The `valueGetter` is the task 2.2 helper. **For a row with no use types
  it returns the em dash, not an empty string** — MUI's default string comparator sorts an
  empty string before every letter, which would put those rows first ascending instead of
  last (`design.md` Decision 6). Verify by loading the grid and confirming the header order
  reads DESCRIPTION, ENVIRONMENT, ORGANIZATION, DNS, USE TYPES, STATUS, CREATED, EXPIRES,
  CREATED BY, ACTION.

- [ ] 3.5 Confirm the column sorts. Verify by clicking the USE TYPES header twice and
  checking that rows group by first label ascending, then descending, and that a row with no
  use types lands last ascending rather than at a random position.

## 4. The dialog fields

- [ ] 4.1 Add a read-only `PolicyField label="Use Types"` to `RenewDialog`
  (`index.tsx:1306`), after the Jurisdiction + Environment row and before Description, with
  the value from the task 2.2 helper. Match `ReissueDialog` (`index.tsx:1652`) exactly — same
  component, same label, same position. Verify by opening Renew on an Active key with two use
  types and reading both labels, with no control that changes them.

- [ ] 4.2 Confirm `ReissueDialog` needs no change. Verify by opening Re-issue on an Expired
  key and reading the existing Use Types field, then confirming that the diff does not touch
  `ReissueDialog`.

- [ ] 4.3 Confirm `KeyCreatedDialog` is unchanged. Verify by revealing a token and seeing
  only the key expiry and the token string, and by confirming the diff does not touch that
  component.

- [ ] 4.4 Add `e2e/tests/apikeys.spec.ts` — the first Playwright coverage for `/apikeys`. Use
  `e2e/helpers/oktaLogin.ts` for login. Assert that the `USE TYPES` header exists between
  `DNS` and `STATUS`, that a two-use-type row renders both labels, that a three-use-type row
  renders two labels plus an overflow indicator, and that the Renew dialog on an Active key
  shows a read-only Use Types field. Verify by running
  `BASE_URL=http://localhost:3000 npx playwright test e2e/tests/apikeys.spec.ts` against the
  local server from task 1.1, and seeing it pass.

## 5. Narrowing the list

- [ ] 5.1 Add `useType: string` to the `ApiKeyFilters` interface and `useType: ''` to
  `EMPTY_FILTERS`. Verify by `tsc --noEmit` passing, which it will only do once every reader
  of that type handles the new key.

- [ ] 5.2 Add a fourth `renderFilterSelect('Use Types', 'useType', useTypeFilterOptions)`
  call after the Organization dropdown (`index.tsx:1022`), with options built from
  `ALLOWED_USE_TYPES` as values and `USE_TYPE_LABELS` as labels. Verify by opening the filter
  popover and seeing four dropdowns with Patient, Provider and Public Health in the fourth.

- [ ] 5.3 Add the `useType` term to `activeFilterCount` beside the existing three. Verify by
  setting only the use-type filter and seeing the badge read 1, then by pressing **Clear all**
  and seeing the dropdown reset with the badge gone.

- [ ] 5.4 Add the filter clause to `filteredRows` (`index.tsx:2917`): a row matches when no
  use-type filter is set, or when `row.useTypes` **contains** the selected value. Verify by
  filtering to Patient and confirming that a Patient-only key and a Patient + Provider key
  both appear, and a Provider-only key does not.

- [ ] 5.5 Add the search clause to the same `matchesSearch` expression: test the term against
  the task 2.2 joined label string, lower-cased. Verify by typing "public health" and seeing
  only keys carrying Public Health, and by confirming that typing `PUBLIC_HEALTH` matches
  nothing.

- [ ] 5.6 Extend `e2e/tests/apikeys.spec.ts` from task 4.4 to cover both. Assert that
  filtering to one use type keeps a multi-use-type key in the list, and that a search for a
  label narrows the rows. Verify by running the spec against the local server and seeing it
  pass.

## 6. Documentation and integration

- [ ] 6.1 Update §3 of the *IZGateway API Key Management — Operations Manual* (Confluence page
  960888833). Its column list reads "Description …, Environment, Organization, DNS, Status,
  Created, Expires, Created By, Action" and must name USE TYPES in its grid position. Add one
  sentence stating that a row with more than two use types shows two and a count, with the
  rest on hover. Verify by re-reading §3 against the shipped grid. Confirm the edit with the
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

- [ ] 6.4 Run `npm run code-quality-check` and verify that lint and `tsc --noEmit` both pass.
  `no-explicit-any` and `no-unused-vars` are errors in this repo, not warnings.

- [ ] 6.5 Check the grid at the narrowest supported viewport. The sum of the columns'
  `minWidth` rises from 1220px to 1390px. Verify that the grid scrolls horizontally and that
  no column collapses or clips its header. Confirm no row height changed —
  `density="comfortable"` must still govern every row, and `getRowHeight` must stay `auto`
  for the audit tab only.

- [ ] 6.6 Write the manual re-test table as a comment on IGDD-3460, in the format Paul Cahill
  used on IGDD-3184 (test ref, what to do, expected result). Cover every scenario in
  `specs/api-key-credential-lifecycle/spec.md` — the grid, the Renew dialog, the Re-issue
  dialog, the token reveal, the filter and the search. Verify by the comment appearing on the
  ticket, ready for the tester to fill in the result column.

- [ ] 6.7 Confirm the branch dependency has landed before archiving.
  `openspec/specs/api-key-credential-lifecycle/spec.md` exists only on branch
  `openspec-cleanup`, which is not yet an ancestor of `develop`, so this delta currently
  targets a capability that is absent here. The merge is planned and confirmed; only the
  ordering matters. Verify by `openspec list --specs` reporting `api-key-credential-lifecycle`.
  See `proposal.md` — Branch dependency. **Do not archive this change before that.**

- [ ] 6.8 Once the main spec is present, add a `MODIFIED` block to the delta for the
  requirement "The credential list is returned whole and filtered client-side". Its scenario
  "Filters compose with the text search" names environment, status and organization, and must
  name use types too. Copy the whole requirement body, as a partial `MODIFIED` loses detail at
  archive time. Verify by `openspec validate --strict` passing with the block in place.

- [ ] 6.9 Run `openspec validate "api-key-use-types-column" --strict` and verify it reports
  the change as valid.
