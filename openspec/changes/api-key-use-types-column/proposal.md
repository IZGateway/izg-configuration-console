## Why

The API keys grid shows nine columns. Not one of them shows the use types a credential
carries. A credential's use types decide which data populations it can submit, so the
operator who debugs a rejected submission cannot see the field that most often explains
the rejection.

Use types reach the UI in two places today, and neither answers "what is this key scoped
to?":

- The Create form picker collects them (`ApiKeyManagement/index.tsx:2394`). That is input,
  not display.
- The Re-issue dialog displays them (`index.tsx:1652`), and only for a key that is already
  **expired**.

**An Active key has no screen that states its scope.** The eye icon on an Active row opens
the one-time token reveal dialog (`KeyCreatedDialog`, `index.tsx:2650`), which shows the key
expiry and the token string and nothing about scope. That icon renders only while
`!row.viewed`, so it disappears for good after one reveal. The Renew dialog
(`index.tsx:1306`) shows Jurisdiction, Environment, Description and Domain, and no use
types.

So for a live, working key there is no screen in the product that states its use types.

**The team resolved this in a meeting on 2026-09-30.** Use types go on the keys grid and on
the Renew dialog. On the dialog they are read-only, like every other field it carries. The
Re-issue dialog already shows them and needs no change. The one-time token reveal dialog
stays exactly as it is.

**The product owner then confirmed, on 2026-10-01**, that the keys list must also be
narrowable by use type: a fourth filter dropdown, and a use-type match in the search box.

IGDD-3184 task P3-UI states the requirement: *"Surface useTypes as a column in the keys
grid."* The product-owner review of IGDD-3184 deferred it to the backlog, and IGDD-3460
carries it.

**A note on the ticket text.** IGDD-3460's description is a paste of the IGDD-3184 review
item, and it ends with *"This is not in scope and will be a future enhancement."* That
sentence recorded the decision to defer the work. It does not limit this ticket. Anusha
Kanuri wrote it as an answer on IGDD-3184, and James Spillman then asked for exactly this
backlog ticket.

**A related ticket that the code contradicts.** IGDD-3338, *"There is no way to see the use
types of an existing API key in the UI"*, is marked Resolved. No commit references it, and
the statement in its title is still true for every key status. The status stays as it is, by
decision, and the two tickets are now linked as related. **This change is what closes that
gap for an Active key**, because the grid is the only surface an Active key has.

## What Changes

Line numbers in this section predate the UI review (PR #711) and are approximate.

### The grid column

- **A new `USE TYPES` column in the API keys grid**, between DNS and STATUS. This groups
  the scope columns with the identity columns and keeps the lifecycle columns (STATUS and
  DURATION) together to its right.

- **One MUI `Chip` per use type**, styled to match the Create form picker so the same value
  looks the same in both places — `#e3f2fd` background, `palette.primary` text and border
  (`Dropdown/SearchableMultiSelect.tsx:35`). The chips render at `size="small"`, not the
  picker's 32px height, because a 32px chip in a `density="comfortable"` row reads as an
  input field rather than a cell.

- **Every chip is shown, and the cell wraps rather than clips.** Rows grow to fit their
  content. A "+N more" chip with a tooltip that lists every use type appears only when two
  or more use types would be hidden. A single extra use type shows as its own chip, because
  "+1 more" takes as much room as the chip it hides. With three use types in the
  enumeration, no credential reaches the count today. (Set by the UI review — see below.)

- **Chips render in canonical `ALLOWED_USE_TYPES` order** — `PATIENT`, `PROVIDER`,
  `PUBLIC_HEALTH` — not in stored order. DynamoDB persists `useTypes` as a String Set, which
  is unordered, so stored order is not a stable thing to display.

- **"None" for an empty value in the grid and on a card.** The Create form blocks a
  submission with no use types (`index.tsx:2548`), so every key created through the UI
  carries at least one. But `useTypes` is optional on `ApiKeyCredential` and DynamoDB is
  schemaless, so a malformed or legacy row must still render. The dialog fields show an em
  dash for the same case, like every other empty read-only field there.

- **Sortable, not filterable.** A `valueGetter` gives the column one derived string: the
  labels in canonical order, joined by ", ". The grid sorts on that string with its default
  comparator. There is no custom `sortComparator` (design Decision 6). The column is not
  filterable, because the grid exposes no filter panel to a user: the `DataGrid` sets
  `disableColumnMenu` and the toolbar holds a custom filter popover with `Select` dropdowns
  instead. A `filterable: true` flag would have no reachable effect.

- **Focused Playwright coverage for use types.** `apiKeyDashboard.spec.ts` and the
  lifecycle specs already open `/apikeys`, but none of them covers use types. This change
  adds a spec for the column header and the rendered chips.
  The Jest jsdom suites cannot verify it: they fail on this repo with `ERR_REQUIRE_ESM`, a
  known upstream packaging problem recorded in `.claude/CLAUDE.md`.

### The dialogs

- **The Renew dialog gains a read-only Use Types field** (`index.tsx:1306`). It joins
  Jurisdiction, Environment and Domain, which are already carried over read-only because a
  renewal cannot change them. Use types behave the same way: the spec already states that
  renewal takes them from the record and not from the request, so showing them read-only
  states a rule the code already enforces. This is the surface that answers the question for
  an **Active** key.

- **The Re-issue dialog already shows use types** on its confirm step (`index.tsx:1652`).
  Its position and label do not change. One line changes: the value now comes from the
  shared helper, so the dialog shows the canonical order and not the stored order. The
  delta spec states that behaviour anyway, because nothing specifies it
  today and it would otherwise be free to disappear in a refactor.

- **The one-time token reveal dialog does not change.** It handles a secret that is shown
  once and never again, and its content is deliberately minimal.

- **No data-layer change anywhere.** The grid row already carries
  `useTypes: AllowedUseType[]` (`index.tsx:265`, populated at `:431`), and `RenewDialog` and
  `ReissueDialog` each already receive that whole row as their `apiKey` prop. `USE_TYPE_LABELS` already maps each value to a human-readable label
  (`lib/type/AllowedUseType.ts`). Nothing new is fetched or plumbed.

### Narrowing the list

- **A fourth filter dropdown, "Use Types"**, in the existing filter popover beside
  Environment, Status and Organization (`index.tsx:1020`). Single-select, like its three
  neighbours. It **matches on membership**: picking "Patient" shows every key that carries
  Patient, whether or not it also carries Provider or Public Health. That is how the
  Environment filter already treats a multi-environment key (`index.tsx:2927`), so the
  popover behaves consistently.

- **The search box matches use-type labels.** Typing "patient", "provider" or "public health"
  finds keys carrying that use type. Case-insensitive substring, exactly like the five fields
  the box already matches (`index.tsx:2919`). The labels only — the stored forms such as
  `PUBLIC_HEALTH` appear nowhere in the UI.

- **`ApiKeyFilters` gains a fourth key.** The interface, `EMPTY_FILTERS`, and the
  `activeFilterCount` badge all enumerate the three filters explicitly, so each needs the
  fourth. The badge and **Clear all** then cover the new dropdown with no further work.

### The UI review — mattystank, 2026-10-05 and 2026-10-06

The UI reviewer refined the page in two commits, `7d1f70e` and `55275da` (merged in PR
#711). **That work is authoritative: these artifacts describe it, and nothing here changes
it.** It settles the chip-width question that `design.md` had left open, and it changes the
page around the new column:

- **Chips wrap, and every row grows to fit.** `getRowHeight` returns `auto` for both tabs,
  with vertical cell padding. The "+N more" chip appears only when two or more use types
  would be hidden. This is Option C from the old Open Question.
- **An empty use-type cell reads "None"**, not an em dash. The sort key is still the em
  dash, so empty rows group together. They sort first in ascending order and last in
  descending order.
- **CREATED and EXPIRES merge into one DURATION column.** It keeps the `created` field, so
  the newest-first default sort and the created-date comparator still apply. The grid has
  nine columns with USE TYPES, not ten.
- **STATUS is capped at 150px** and wraps.
- **A card view below 1344px.** Each key is a card that shows its use types through the
  same `UseTypesCell`, under a "Use Types:" label. The filter and the search are shared with
  the grid, and both views read the same `filteredRows`.
- **Row actions collapse into a "More Options" menu below 1600px.**
- **A Columns popover** lets an operator hide and show grid columns, with a "Default view"
  button. Every column, USE TYPES included, is visible by default. `disableColumnSelector`
  was removed.
- **Keys / Audit Log tabs restyled** to match Access Control, and the stat cards share a
  row on small screens.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `api-key-credential-lifecycle`: gains three new requirements — **"A credential's use types
  are visible in the keys list"**, **"The dialogs that act on a credential state its use
  types"**, and **"The keys list can be narrowed by use type"**. It also modifies one
  existing requirement, **"The credential list is returned whole and filtered
  client-side"**: its scenario "Filters compose with the text search" now names use type
  beside environment, status and organization.

  The capability's existing requirement, "Use types are captured and validated on the
  credential" (`openspec/specs/api-key-credential-lifecycle/spec.md:393`), covers capture,
  validation, how renewal and re-issue each source the values, and how the Create dialog
  narrows the picker to the organization's registration. It says nothing about where a user
  reads a credential's use types after creation.

  The delta uses `ADDED` rather than `MODIFIED` on that requirement, because display is a
  new concern and no existing scenario changes behaviour. A partial `MODIFIED` block loses
  detail at archive time, and every scenario in the existing requirement stays true.

## Branch dependency — landed

The delta targets `api-key-credential-lifecycle`, whose main spec lived only on branch
`openspec-cleanup` when this change was written. That spec has since reached `develop`
(`5efc9bb`, "OpenSpec Archive (#705)") and this branch, and `openspec list --specs` reports
it. The line references to `openspec/specs/api-key-credential-lifecycle/spec.md` in these
artifacts now resolve here.

The `MODIFIED` block that waited on it is now in the delta. It extends the scenario "Filters
compose with the text search" from three filters to four.

## Impact

**One component file, one new test file, and compatibility updates to five test files.**

- Modified: `src/components/ApiKeyManagement/index.tsx`:
  - a shared helper that returns a row's use types in canonical order,
  - a `UseTypesCell` component beside `StatusCell`, plus one new entry in the `columns`
    array. The card view reuses the same component,
  - one `PolicyField` in `RenewDialog`,
  - a fourth key on `ApiKeyFilters` plus a fourth `renderFilterSelect` call,
  - two added clauses in `filteredRows` — one for the filter, one for the search,
  - accessible names for the compact actions button, the filter dropdowns and the column
    chooser checkboxes, and the "Untitled key" card heading. These come from the Copilot
    reviews of PR 723.
- The same file carries the UI review's changes, listed above.
- New: `e2e/tests/apikeys.spec.ts`. It covers the column, the Renew and Re-issue dialog
  fields, the filter, the search, the column chooser and the card view.
  `e2e/helpers/oktaLogin.ts` already provides the login step. The spec runs at 1680px for
  the grid tests. Its last test narrows the viewport to 1280px to cover the cards, then
  restores it.
- Modified for compatibility: `apiKeyDashboard.spec.ts`, `apiKeyViewToken.spec.ts`,
  `apiKeyCreateNewDomain.spec.ts` and `apiKeyCreateExistingDomain.spec.ts` run at the new
  `API_KEYS_VIEWPORT` (1680×1050) from `e2e/helpers/apiKeyHelpers.ts`, because the page
  shows cards at the default 1280px. The dashboard spec expects the USE TYPES and DURATION
  columns.
- Unchanged, deliberately: `KeyCreatedDialog` (the token reveal). `ReissueDialog` changes
  by one line, so that it uses the shared helper.

**No API, database, or authorization change.** The column reads a field that
`GET /api/apikeys` already returns and that the row object already holds. That route is
already role-gated and already scoped to the caller's owned jurisdictions.

**No new data exposure.** A caller who can see a row receives that row's `useTypes` in the
JSON response today. This change renders a value the browser already has.

**Width is no longer a cost to manage.** The first draft added a tenth column and accepted a
horizontal scroll on narrow screens. The UI review removed that cost. DURATION merges two
columns, so the grid stays at nine. Chips wrap instead of clipping. Below 1344px the page
shows cards instead of a grid.
