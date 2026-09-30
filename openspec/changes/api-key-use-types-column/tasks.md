# Tasks

Scope is item 1 only — the grid column. Items 2 to 4 (the View key dialog field, the filter
dropdown, the search match) wait on IGDD-3460 comment 116513. See `design.md` — Open
Questions.

## 1. Preconditions

- [ ] 1.1 Set up a local run target for the e2e spec. `playwright.config.ts:13` reads
  `baseURL` from `process.env.BASE_URL` and defines no `webServer`, so the suite runs against
  whatever URL that variable names. Start `npm run dev` with
  `FEATURE_API_KEY_MANAGEMENT_ENABLED=true`, then verify by running an existing spec with
  `BASE_URL=http://localhost:3000` and seeing it reach the app.

  **Task 2.7 is verified locally, before merge.** It cannot pass against a deployed
  environment until this change deploys there, because it asserts a column that does not
  exist yet. Task 4.4 therefore does not wait on a deployed run.

- [ ] 1.2 Confirm the local environment holds at least one credential with two use types and
  one with all three. Verify by reading the `useTypes` values in the `GET /api/apikeys`
  response. Without a three-value row, task 2.7 cannot assert the `+N` overflow, and this
  task becomes "create such a key through the Create dialog".

  Note for the record: Paul Cahill's IGDD-3184 comment states that
  `FEATURE_API_KEY_MANAGEMENT_ENABLED` shipped **off** for release 1.18.0. Confirm the
  deployed value with Paul before anyone expects the e2e spec to run in CI against a
  deployed environment.

## 2. The USE TYPES column

- [ ] 2.1 Add one helper to `src/components/ApiKeyManagement/index.tsx` that takes an `ApiKey`
  row and returns its use types as `AllowedUseType[]`, filtered by membership in
  `ALLOWED_USE_TYPES`. This gives canonical order and drops any stored value outside the
  enumeration. Both the cell of task 2.2 and the `valueGetter` of task 2.5 MUST call it, so
  the chips and the sort key can never disagree. Verify by a row whose `useTypes` holds an
  unrecognized value: neither the chips nor the sort key shows it.

- [ ] 2.2 Add a `UseTypesCell` component beside `StatusCell`. It calls the task 2.1 helper,
  maps each value through `USE_TYPE_LABELS`, and renders an em dash when the result is empty.
  Verify by rendering the page and comparing three rows — one use type, two, and none —
  against their `useTypes` values in the API response.

- [ ] 2.3 Render the first two labels as `Chip` elements with `size="small"`, the
  `SearchableMultiSelect` `chipColor="primary"` palette (`#e3f2fd` background,
  `palette.primary` text and 1px border) and `fontSize: '0.875rem'`. Verify by opening the
  Create dialog beside the grid and confirming that the same use type looks the same in both.

- [ ] 2.4 Render a `+N` indicator after the second chip when the row carries more than two
  use types, wrapped in a `Tooltip` whose title lists every label. Make the indicator
  focusable, so `Tab` opens the tooltip — a hover-only disclosure is unreachable by keyboard.
  Verify by tabbing to the indicator with no mouse and reading the full list.

- [ ] 2.5 Insert the column into the `columns` array (`index.tsx:3190`) **between the `domain`
  and `status` entries**, with `field: 'useTypes'`, `headerName: 'USE TYPES'`, `flex: 1.5`,
  `minWidth: 170`, `sortable: true`, `filterable: false`, and `renderCell` returning
  `<UseTypesCell />`. The `valueGetter` calls the task 2.1 helper and joins the labels with
  `", "`. **For a row with no use types it returns the em dash, not an empty string** — MUI's
  default string comparator sorts an empty string before every letter, which would put those
  rows first ascending instead of last (`design.md` Decision 6). Verify by loading the grid
  and confirming the header order reads DESCRIPTION, ENVIRONMENT, ORGANIZATION, DNS, USE
  TYPES, STATUS, CREATED, EXPIRES, CREATED BY, ACTION.

- [ ] 2.6 Confirm the column sorts. Verify by clicking the USE TYPES header twice and
  checking that rows group by first label ascending, then descending, and that a row with no
  use types lands last ascending rather than at a random position.

- [ ] 2.7 Add `e2e/tests/apikeysGrid.spec.ts` — the first Playwright coverage for `/apikeys`.
  Use `e2e/helpers/oktaLogin.ts` for login. Assert that the `USE TYPES` header exists, that
  it sits between `DNS` and `STATUS`, that a two-use-type row renders both labels, and that a
  three-use-type row renders two labels plus an overflow indicator. Verify by running
  `BASE_URL=http://localhost:3000 npx playwright test e2e/tests/apikeysGrid.spec.ts`
  against the local server from task 1.1, and seeing it pass.

- [ ] 2.8 Write the manual re-test steps as a comment on IGDD-3460, in the table format Paul
  Cahill used on IGDD-3184 (test ref, what to do, expected result). Cover the four scenarios
  in `specs/api-key-credential-lifecycle/spec.md`. Verify by the comment appearing on the
  ticket, ready for the tester to fill in the result column.

## 3. Documentation

- [ ] 3.1 Update §3 of the *IZGateway API Key Management — Operations Manual* (Confluence page
  960888833). Its column list reads "Description …, Environment, Organization, DNS, Status,
  Created, Expires, Created By, Action" and must name USE TYPES in its grid position. Add one
  sentence stating that a row with more than two use types shows two and a count, with the
  rest on hover. Verify by re-reading §3 against the shipped grid. Confirm the edit with the
  page owner before posting — the page is shared and marked DRAFT.

  Leave the same section's **Search** sentence as it is. It reads "matches key ID,
  description, jurisdiction, DNS name, or environment", which stays accurate, because this
  change does not touch the search box.

- [ ] 3.2 Replace the keys-screen screenshot in §3 of that page
  (`image-20260817-171917.png`), which shows the nine-column grid. Verify by the new image
  showing the USE TYPES column.

## 4. Integration verification

- [ ] 4.1 Run `npm run code-quality-check` and verify that lint and `tsc --noEmit` both pass.
  `no-explicit-any` and `no-unused-vars` are errors in this repo, not warnings.

- [ ] 4.2 Check the grid at the narrowest supported viewport. The sum of the columns'
  `minWidth` rises from 1220px to 1390px. Verify that the grid scrolls horizontally and that
  no column collapses or clips its header.

- [ ] 4.3 Confirm no row height changed. Verify by comparing a screenshot of the grid against
  one taken before the change — `density="comfortable"` must still govern every row, and
  `getRowHeight` must stay `auto` for the audit tab only.

- [ ] 4.4 Run `openspec validate "api-key-use-types-column" --strict` and verify it reports
  the change as valid.
