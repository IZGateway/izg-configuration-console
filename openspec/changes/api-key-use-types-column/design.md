## Context

See `proposal.md` — Why. The behaviour contract is in
`specs/api-key-credential-lifecycle/spec.md`.

Constraints that shape the approach:

- The grid is `@mui/x-data-grid` v5 community (`DataGrid`, not `DataGridPro`). Columns are a
  memoized `GridColDef[]` at `ApiKeyManagement/index.tsx:3190`.
- The `DataGrid` sets `disableColumnMenu`, `disableColumnSelector` and
  `disableDensitySelector` (`index.tsx:3419`). The toolbar is a custom slot,
  `CustomToolbar`, and it holds a search box and a filter popover with three `Select`
  dropdowns. There is no MUI filter panel, and no CSV export.
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
- No column-visibility control for the operator. `disableColumnSelector` is already set and
  this change does not revisit that.

## Decisions

### Decision 1 — Position: after DNS, before STATUS

The grid reads left to right as identity, then scope, then lifecycle, then action. DNS ends
the identity group. STATUS begins the lifecycle group with CREATED and EXPIRES. Use types
are scope, so they belong between the two.

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

### Decision 4 — Two chips, then `+N`, with the full list in a tooltip

A credential can carry all three use types. The cell shows the first two chips in canonical
order and then a `+N` indicator. The indicator carries a tooltip listing every use type.

This follows a pattern the grid already uses twice: DESCRIPTION puts the key id in a
tooltip, and DNS puts the full domain in one (`index.tsx:3196`, `:3235`).

*Alternatives considered.* **Always show all three**, which needs roughly 240px of column
width — rejected because it takes that width from DESCRIPTION and ORGANIZATION on every row,
to serve the minority of rows that carry three. **Wrap onto a second line**, which needs
`getRowHeight` to return `auto` for the Keys tab — rejected because it changes the height of
every row in the grid to accommodate a few, and `getRowHeight` is currently `auto` for the
audit tab only (`index.tsx:3392`).

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
This is what makes Decision 7's sort claim true. MUI's default string comparator places an
empty string before every letter, so an empty return would sort those rows *first*
ascending. The em dash (U+2014) sorts after every Latin letter, so they sort last instead,
which is the position the spec scenario calls consistent.

`renderCell` ignores the derived string. It calls the same helper and maps the result to
chips.

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
use types renders an em dash, which sorts after every label in ascending order — a
consistent position, not an arbitrary one.

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
decision affecting all ten columns.

### Decision 8 — A named `UseTypesCell` component, not an inline `renderCell`

The component sits beside `StatusCell` and `ActionCell`, which is where this file already
puts cell logic with more than one branch. The `columns` array stays readable, and the cell
becomes testable on its own if the Jest suite is ever repaired.

### Decision 9 — Width: `flex: 1.5`, `minWidth: 170`

Two small chips plus the `+N` indicator and the cell padding need about 170px. `flex: 1.5`
matches ORGANIZATION and DNS, so the new column grows at the same rate as its neighbours
rather than dominating.

This raises the sum of the columns' `minWidth` from 1220px to 1390px. See Risks.

### Decision 10 — Verification is a new Playwright spec

`e2e/tests/` holds 16 specs and not one of them opens `/apikeys`. This change adds the
first, with `e2e/helpers/oktaLogin.ts` for the login step. It covers the column header and
chips, the Renew dialog field, the filter and the search — see tasks 4.4 and 5.6.

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
- `ReissueDialog`: already there. No change.

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

**The grid needs 170px more horizontal room.** → Every column keeps its `minWidth`, so a
narrow viewport scrolls horizontally instead of crushing a column. The tooltip carries the
overflow, so the column can stay at its minimum and still show every value. Confirm the
1390px total against the narrowest supported viewport during review.

**The `+N` indicator hides data behind a hover.** → A hover-only disclosure is not reachable
by keyboard or by a screen reader. The indicator must therefore be a focusable element, so
that `Tab` opens the tooltip, and the cell's accessible text must be the full joined label
string from Decision 6 rather than the truncated visual. This repo runs `@axe-core/react` in
development (`src/pages/_app.tsx`), which catches a missing accessible name but will not
catch a hover-only disclosure. Check it by hand.

**Sorting groups by first label, which can surprise.** → Sorting "Public Health" keys after
"Provider" keys is alphabetical and correct, but an operator can expect a sort by breadth
(one use type, then two, then three). Documented here and in the test plan. If operators ask
for breadth, the comparator is a one-line change.

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

