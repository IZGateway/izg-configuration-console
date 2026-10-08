## Context

See `proposal.md` — Why. The behaviour contract is in
`specs/api-key-credential-lifecycle/spec.md`.

**The UI review is authoritative.** mattystank's commits `7d1f70e` and `55275da` (PR #711)
changed the page after this design was first written. Where they differ from a decision
below, the decision has been rewritten to match the code. See `proposal.md` — The UI review.
Line numbers in this document predate those commits and are approximate.

Constraints that shape the approach:

- The grid is `@mui/x-data-grid` v7 community (`DataGrid`, not `DataGridPro`). In v7
  `valueGetter` takes `(value, row, column, apiRef)`, not a params object. Columns are a
  memoized `GridColDef[]` at `ApiKeyManagement/index.tsx:3190`.
- The `DataGrid` sets `disableColumnMenu` and `disableDensitySelector`. The toolbar is a
  custom slot, `CustomToolbar`, and it holds a search box, a Columns popover (hide and show
  columns, with a "Default view" button) and a filter popover of `Select` dropdowns. There
  is no MUI filter panel, and no CSV export.
- The page has two layouts. At 1344px and wider it shows the `DataGrid`. Below 1344px it
  shows one card per key (`MobileApiKeyView`). Both read the same `filteredRows`. Below
  1600px the grid's row actions collapse into a "More Options" menu.
- Every grid row is auto-height (`getRowHeight={() => 'auto'}`) with vertical cell padding,
  on both tabs.
- Every row is already in the browser. `filteredRows` (`index.tsx:2917`) filters client-side
  over the whole list. The spec records this as "The credential list is returned whole and
  filtered client-side".
- The row type already carries the data: `useTypes: AllowedUseType[]` on `ApiKey`
  (`index.tsx:265`), populated from `cred.useTypes ?? []` (`index.tsx:431`).
- `USE_TYPE_LABELS` and `ALLOWED_USE_TYPES` in `src/lib/type/AllowedUseType.ts` are the one
  source of labels and of canonical order.
- The whole page is behind a release flag, `FEATURE_API_KEY_MANAGEMENT_ENABLED`
  (`src/lib/security/apiKeyAuthz.ts:38`), surfaced on the session as
  `apiKeyManagementEnabled` (IGDD-3444).

## Goals

- An operator reads a credential's use types from the keys list, with no click.
- An operator reads them again at the moment of renewing or re-issuing a key.
- The same value looks the same everywhere it appears.
- One derived value serves display, sorting, filtering and search.

## Non-Goals

- **No MUI column filter.** The filter is delivered through the toolbar popover, not through
  the column's own `filterable` flag, which stays off. See Decisions 7 and 14.
- **No change to the one-time token reveal dialog.** See Decision 13.
- **No change to how renewal sources use types.** The Renew dialog displays them. It does not
  submit them. The spec already states that renewal reads them from the record.
- **No change to how use types are captured, validated, or inherited.** Every existing
  scenario in the "Use types are captured and validated on the credential" requirement stays
  exactly as it is.
- No change to the Columns popover. The UI review added it. This change requires only that
  USE TYPES is visible in the default view, which it is: the default visibility model hides
  nothing.

## Decisions

### Decision 1 — Position: after DNS, before STATUS

The grid reads left to right as identity, then scope, then lifecycle, then action. DNS ends
the identity group. STATUS begins the lifecycle group with DURATION (the UI review merged
CREATED and EXPIRES into it). Use types are scope, so they belong between the two.

*Alternatives considered.* **After ENVIRONMENT**, which puts the two scope columns side by
side — rejected because it splits the identity group, and because ORGANIZATION and DNS
together answer "whose key is this", which a reader follows in one sweep. **At the end
before ACTION**, which disturbs the least — rejected because it puts scope next to the
action buttons, where it reads as an afterthought.

### Decision 2 — One chip per use type, styled from the Create picker

The Create dialog renders the same values as chips through `SearchableMultiSelect` with
`chipColor="primary"` — `#e3f2fd` background, `palette.primary` text, a 1px
`palette.primary` border (`Dropdown/SearchableMultiSelect.tsx:35`). The grid reuses those
three values, so an operator who selects "Patient, Provider" at create time sees the same
two objects in the list afterwards.

*Alternatives considered.* **Comma-joined plain text**, which is what the ENVIRONMENT column
does for a multi-environment key — cheaper, and consistent with a neighbouring column, but
it reads as one value rather than a set, and it loses the visual tie to the picker.
**Short codes with a tooltip** (`PAT, PRV, PH`) — narrowest, and rejected because it invents
abbreviations that appear nowhere else in the product or its documentation.

### Decision 3 — `size="small"` chips, not the picker's 32px

The picker sets `height: '32px'`, which suits a form field. Grid rows render at
`density="comfortable"`. A 32px chip inside that row fills it edge to edge and reads as an
input control rather than a cell value. The grid chips therefore use MUI's `size="small"`
(about 24px) and keep the picker's colours and `0.875rem` font.

This is a deliberate divergence from Decision 2's "reuse the picker styling". Colour carries
the recognition; height does not.

### Decision 4 — Show every chip and wrap; collapse only when two or more would be hidden

*Set by the UI review. This replaces the first draft, which showed two chips and then `+N`
and kept a fixed row height.*

The cell is a wrapping flex container. Every chip is shown, and when the column is narrow
the chips move onto a second line. They are never clipped. Rows are auto-height, so the row
grows to fit.

A "+N more" chip appears only when two or more use types would be hidden. It then follows
the first two chips, and its tooltip lists every use type. A single extra use type is shown
as its own chip, because "+1 more" takes as much room as the chip it hides.

The enumeration holds three use types, so no credential reaches the count today. The rule
stays in the code and in the spec so that a fourth use type does not change the display
without a decision.

*Why the first draft changed.* Manual testing found that a second chip clipped at
`minWidth: 170` ("Public Healt"), and two use types is the common case in real data. The
first draft rejected wrapping because it would change the height of every row. The UI
review made every row auto-height anyway, for its own reasons, so that cost no longer
applies.

### Decision 5 — Canonical order, never stored order

Chips render in `ALLOWED_USE_TYPES` order: `PATIENT`, `PROVIDER`, `PUBLIC_HEALTH`.

The store persists `useTypes` as a DynamoDB String Set. A Set is unordered, so the order the
SDK returns is not a promise and can differ between two rows that hold the same values.
Display order must not depend on it. The cell therefore filters `ALLOWED_USE_TYPES` by
membership rather than iterating the row's array.

That filter also drops any stored value outside the enumeration, which is the same guard the
read path already applies (`isValidUseType`).

**One helper does the filter, and both readers use it.** A single function takes a row and
returns its use types as `AllowedUseType[]` in canonical order, already filtered. The
`valueGetter` of Decision 6 and the cell renderer both call it. If each did its own filter,
a stored value outside the enumeration could reach the sort key while the chips dropped it,
and two readers of the same row would disagree.

### Decision 6 — A `valueGetter` produces one derived string, and sorting uses it

The column's `field` is `useTypes`, whose value is an array. Sorting an array is meaningless
to the grid, so the column declares a `valueGetter`. It calls the Decision 5 helper and
joins the resulting labels with a comma — `"Patient, Provider"`.

**For a row with no use types the `valueGetter` returns the em dash, not an empty string.**
This gives those rows one shared sort key, so they group together instead of scattering.

**Corrected 2026-10-07 by observation.** An earlier draft of this decision claimed that the
em dash (U+2014) sorts after every Latin letter, and that rows with no use types therefore
land last in ascending order. That claim is wrong. MUI compares the derived strings with
the platform collation, which places punctuation **before** letters. Manual testing against
88 rows confirmed it: on the first click of the header the "None" rows appear at the top.
The spec scenario was relaxed to require a predictable group position, not the last
position. The behavior is unchanged, and the alternative below was reconsidered and
rejected again — the position is deterministic, and the change author accepted it
(Austin Moody, 2026-10-07).

`renderCell` ignores the derived string. It calls the same helper and maps the result to
chips. For an empty set it renders "None" (set by the UI review), not the em dash. The
display and the sort key are therefore separate values.

One derived value then serves three purposes: the sort key now, the filter value if item 3
lands, and the accessible text of the cell.

*Alternative considered.* A `sortComparator` that reads the row through `api.getRow`, which
is what the CREATED column does (`index.tsx:3260`). Rejected here because CREATED needs a
comparator for a different reason: its sort key lives in a *separate* field, `createdOnRaw`,
because the displayed string is a locale date that sorts lexically and wrongly. This column
has no such split — the derived string sorts correctly as it stands.

### Decision 7 — Sortable, with the column's own filter flag off

`sortable: true`. Sorting on the joined labels groups rows by their first use type, so all
Patient keys sit together, then Patient+Provider, then Provider, and so on. A row with no
use types has the em dash as its sort key, so all such rows group at one end of the list — at
the start in ascending order, at the end in descending order. The position is consistent,
not arbitrary. See the correction in Decision 6.

`filterable: false` on the column, **and a filter is still delivered** — through the toolbar,
not through the column. The two are separate things and it is worth being exact about which
is which.

The column flag stays `false` because **no MUI filter UI is reachable in this grid.**
`disableColumnMenu` removes the per-column menu, and the custom toolbar has no filter button,
so MUI's filter panel never opens. A `filterable: true` flag would be inert code that reads
as a delivered feature.

The filter an operator actually uses is the toolbar popover, and the new dropdown goes there.
See Decision 14.

*Alternative considered.* Set `filterable: true` anyway so the column is ready if the column
menu is ever enabled — rejected as speculative. Enabling `disableColumnMenu` would be its own
decision affecting all nine columns.

### Decision 8 — A named `UseTypesCell` component, not an inline `renderCell`

The component sits beside `StatusCell` and `ActionCell`, which is where this file already
puts cell logic with more than one branch. The `columns` array stays readable, and the cell
becomes testable on its own if the Jest suite is ever repaired.

### Decision 9 — Width: `flex: 1.5`, `minWidth: 170`

`flex: 1.5` matches ORGANIZATION and DNS, so the new column grows at the same rate as its
neighbours rather than dominating. `minWidth: 170` holds two chips side by side when there
is room. When there is not, they wrap (Decision 4).

The grid only renders at 1344px and wider. Below that the page shows cards, so the grid no
longer needs to scroll sideways on a narrow screen.

### Decision 10 — Verification is a new Playwright spec

Other specs already open `/apikeys`: `apiKeyDashboard.spec.ts` checks the header, the
columns and the search, and the lifecycle specs create, reveal and validate keys. None of
them covers use types. This change adds a focused spec, `apikeys.spec.ts`, for the column,
the Renew dialog field, the filter, the search and the card view — see tasks 4.4 and 5.6. A
separate spec keeps the use-type tests independent of the lifecycle specs, which create real
keys. It uses `e2e/helpers/oktaLogin.ts` for the login step.

**The spec sets its own viewport of at least 1600px wide.** `playwright.config.ts` uses
1280px. At that width the page shows cards, so no grid selector matches. Below 1600px the
"Renew key" button sits inside the "More Options" menu, so a direct button lookup fails.
The other API key specs now also use a wide viewport (`API_KEYS_VIEWPORT`), because this
change's layout shows cards at 1280px.

Jest cannot do it. Every jsdom suite in this repo fails with `ERR_REQUIRE_ESM`, an upstream
packaging problem in the `jsdom@28` → `html-encoding-sniffer@6` → `@exodus/bytes` chain,
recorded in `.claude/CLAUDE.md`. CI does not run the Jest step. A Jest test written now
would not run, and its failure would be invisible.

*Alternative considered.* A manual test-plan table in Jira, which is how IGDD-3184 was
verified. Rejected as the *only* verification, because a grid column is exactly the kind of
thing a later refactor drops silently. The manual steps are still written, as task 4.

### Decision 11 — The dialogs use a plain `PolicyField`, not chips

In the grid, use types render as chips (Decision 2). In the three dialogs they render as a
plain `PolicyField` — a label above a comma-joined value, which is the component every other
read-only field in those dialogs already uses.

Two reasons. First, the Re-issue dialog already does exactly this (`index.tsx:1652`), and the
team approved that treatment when they approved the Re-issue display, so matching it keeps
the three dialogs identical to each other. Second, a dialog field sits in a vertical stack of
labelled values; a row of chips in that stack reads as an editable control, which is the
opposite of what a read-only carry-over field must signal.

The grid is a different context. A cell has no label of its own and sits in a dense row, so a
chip is what makes a set look like a set there.

*Alternative considered.* Chips everywhere, for one visual language — rejected because it
would make a locked field look editable on the Renew dialog, which is the one dialog where an
operator might expect to change something.

### Decision 12 — Field placement inside each dialog

The field goes directly after the Jurisdiction and Environment pair, which is where the
Re-issue dialog already puts it. That groups the three scope values together, before the
free-text Description.

- `RenewDialog`: after the Jurisdiction + Environment row, before Description.
- `ReissueDialog`: already there; position unchanged. Its value now comes from
  `formatUseTypes` instead of its own inline mapping, which showed stored order. That one-line
  change is required by the spec scenario "Every surface uses the same labels and the same
  order" (found by `/opsx:verify`, 2026-10-07).

### Decision 16 — The card view reuses the grid cell

*Set by the UI review.* Below 1344px each key is a card. The card shows its use types with
the same `UseTypesCell`, after a "Use Types:" label in the identity half of the card. So the
labels, the order, the guard, the wrap and "None" are the same in both layouts, with no
second implementation to keep in step.

### Decision 13 — The one-time token reveal dialog stays as it is

`KeyCreatedDialog` (`index.tsx:2650`) shows the key expiry, the token string and a COPY
TOKEN button, and nothing else.

It does not gain a use types field. The dialog exists for one task under time pressure: copy
a secret that cannot be retrieved again. Every extra field on it competes with that task, and
the operator can read the use types from the grid row behind it.

### Decision 14 — The filter is a fourth single-select, and it matches on membership

The filter popover holds three `Select` dropdowns driven by one `renderFilterSelect` helper
(`index.tsx:1020`). Use Types becomes the fourth, built the same way, with
`ALLOWED_USE_TYPES` as values and `USE_TYPE_LABELS` as labels.

**Single-select, not multi-select.** It is the only control in a popover of three
single-selects. A multi-select there would look and behave unlike its neighbours for a gain
nobody asked for, and the search box already covers the "show me several things" case
loosely.

**It matches on membership, not on an exact set.** Choosing "Patient" returns a key scoped to
Patient alone and a key scoped to Patient + Provider alike. This follows the Environment
filter, which already splits a comma-joined multi-environment value and tests membership
rather than equality (`index.tsx:2927`). An exact-set filter would answer a question nobody
asks — an operator wants "which keys can submit patient data", never "which keys can submit
patient data and nothing else".

**The badge and Clear all come free.** `activeFilterCount` and `EMPTY_FILTERS` enumerate the
filters explicitly, so adding the fourth key to `ApiKeyFilters` and one term to the count is
all the wiring the existing controls need.

### Decision 15 — Search matches the labels, not the stored values

The search term is tested against the same joined label string the grid cell and the
`valueGetter` use, so "public health" matches and `PUBLIC_HEALTH` does not.

Matching the stored enumeration values as well was considered, for an operator pasting a
value out of a log line or an API response. Rejected: the stored form appears nowhere in the
UI, so matching it would make the search box behave on input the product never shows, and
every other field the box matches is matched as displayed.

## Risks / Trade-offs

**The "+N more" path has never run.** → No credential can reach it while the enumeration
holds three values, so it is untested in practice. If a fourth use type is added, the
indicator must be checked then. It is focusable (`tabIndex={0}`), so `Tab` opens its
tooltip. `@axe-core/react` does not catch a hover-only disclosure, so check it by hand.

**An operator can hide the USE TYPES column.** → The Columns popover allows it, and the
choice is not persisted: the grid remounts on a tab change and returns to the default view,
where the column is visible. "Default view" restores it at once.

**Sorting groups by first label, which can surprise.** → Sorting "Public Health" keys after
"Provider" keys is alphabetical and correct, but an operator can expect a sort by breadth
(one use type, then two, then three). Documented here and in the test plan. If operators ask
for breadth, the comparator is a one-line change.

**Playwright sees cards, not the grid, at its default viewport.** → The spec sets a viewport
of at least 1600px itself (Decision 10).

**Playwright cannot reach `/apikeys` unless the release flag is on, and the column does not
exist in a deployed environment until this change deploys there.** → The new spec is
verified **locally, before merge**. `playwright.config.ts:13` reads
`baseURL: process.env.BASE_URL` and declares no `webServer`, so the suite runs against a
local `npm run dev` started with `FEATURE_API_KEY_MANAGEMENT_ENABLED=true`. A deployed run
is a later, separate matter: Paul Cahill's IGDD-3184 comment states the flag shipped **off**
for release 1.18.0, so confirm the deployed value with Paul before anyone expects this spec
to pass in CI against `dev.console.izgateway.org`.

**Three chip colours in a grid that already uses colour for status.** → Not a risk taken:
all three use types share one colour (Decision 2). The STATUS column keeps colour as its own
signal — green for Active, red for Revoked, amber for Grace Period.

## Migration Plan

None. This change adds a read-only column over a field the response already carries. There
is no data change, no API change, and no new environment variable.

Rollback is the revert of one commit. The existing release flag,
`FEATURE_API_KEY_MANAGEMENT_ENABLED`, already gates the entire page, so the column is
invisible wherever the feature is off. No second flag is warranted.

## Open Questions

### Resolved: the column cannot hold two chips at the width the grid can spare

Found in manual testing on 2026-10-01: at `minWidth: 170` a second chip clipped mid-word
("Public Healt"), and two use types is the common case in real data. Three options went to
the UI reviewer: plain text with a tooltip, a wider column, or chips that wrap onto a second
line.

**The UI reviewer chose wrapping**, in `55275da` (2026-10-06), and made every row
auto-height. The same review merged CREATED and EXPIRES into DURATION and added a card view
below 1344px, which together relieve the width pressure across the whole grid. See
Decision 4.

### Not a defect: the Create picker offers two use types, not three

Raised during the same manual test, and recorded so it is not reported again. The Create
dialog's picker narrows to the selected organization's own registration, which the
credential-lifecycle spec requires. The test organization's jurisdiction row carries
`PROVIDER` and `PUBLIC_HEALTH` and no `PATIENT`, so the picker correctly offers two. All
three remain in `ALLOWED_USE_TYPES`.

The new **filter** dropdown deliberately offers all three, like the static Environment and
Status filters, so choosing Patient in that environment returns no rows.
