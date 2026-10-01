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

### The grid column

- **A new `USE TYPES` column in the API keys grid**, between DNS and STATUS. This groups
  the scope columns with the identity columns and keeps the lifecycle columns (STATUS,
  CREATED, EXPIRES) together to its right.

- **One MUI `Chip` per use type**, styled to match the Create form picker so the same value
  looks the same in both places — `#e3f2fd` background, `palette.primary` text and border
  (`Dropdown/SearchableMultiSelect.tsx:35`). The chips render at `size="small"`, not the
  picker's 32px height, because a 32px chip in a `density="comfortable"` row reads as an
  input field rather than a cell.

- **Two chips, then `+N`, with a tooltip that lists every use type.** A credential can carry
  all three. The cell keeps a fixed height and never wraps, which matches how the
  DESCRIPTION and DNS columns already push detail into a tooltip.

- **Chips render in canonical `ALLOWED_USE_TYPES` order** — `PATIENT`, `PROVIDER`,
  `PUBLIC_HEALTH` — not in stored order. DynamoDB persists `useTypes` as a String Set, which
  is unordered, so stored order is not a stable thing to display.

- **An em dash for an empty value.** The Create form blocks a submission with no use types
  (`index.tsx:2548`), so every key created through the UI carries at least one. But
  `useTypes` is optional on `ApiKeyCredential` and DynamoDB is schemaless, so a malformed or
  legacy row must still render.

- **Sortable, not filterable.** A `sortComparator` sorts on the canonical-order joined
  labels. The column is not filterable, because the grid exposes no filter panel to a user:
  the `DataGrid` sets `disableColumnMenu` (`index.tsx:3419`) and the toolbar holds a custom
  filter popover with three `Select` dropdowns instead. A `filterable: true` flag would have
  no reachable effect.

- **The first Playwright coverage for `/apikeys`.** The 16 specs in `e2e/tests/` do not touch
  the page. This change adds a spec that asserts the column header and the rendered chips.
  The Jest jsdom suites cannot verify it: they fail on this repo with `ERR_REQUIRE_ESM`, a
  known upstream packaging problem recorded in `.claude/CLAUDE.md`.

### The dialogs

- **The Renew dialog gains a read-only Use Types field** (`index.tsx:1306`). It joins
  Jurisdiction, Environment and Domain, which are already carried over read-only because a
  renewal cannot change them. Use types behave the same way: the spec already states that
  renewal takes them from the record and not from the request, so showing them read-only
  states a rule the code already enforces. This is the surface that answers the question for
  an **Active** key.

- **The Re-issue dialog already shows use types** on its confirm step (`index.tsx:1652`), so
  it needs no code. The delta spec states that behaviour anyway, because nothing specifies it
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

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `api-key-credential-lifecycle`: gains three new requirements — **"A credential's use types
  are visible in the keys grid"**, **"The dialogs that act on a credential state its use
  types"**, and **"The keys list can be narrowed by use type"**.

  The capability's existing requirement, "Use types are captured and validated on the
  credential" (`openspec/specs/api-key-credential-lifecycle/spec.md:393`), covers capture,
  validation, how renewal and re-issue each source the values, and how the Create dialog
  narrows the picker to the organization's registration. It says nothing about where a user
  reads a credential's use types after creation.

  The delta uses `ADDED` rather than `MODIFIED` on that requirement, because display is a
  new concern and no existing scenario changes behaviour. A partial `MODIFIED` block loses
  detail at archive time, and every scenario in the existing requirement stays true.

## Branch dependency — sequencing, already planned

**This change's delta targets a capability that does not exist on this branch yet.** Branch
`IGDD-3460` is cut from `develop`. The main spec
`openspec/specs/api-key-credential-lifecycle/spec.md` lives only on branch
`openspec-cleanup`, which is **not** an ancestor of `develop`. On this branch
`openspec list --specs` reports five capabilities, and `api-key-credential-lifecycle` is not
one of them.

Two consequences:

1. **Every `openspec/specs/api-key-credential-lifecycle/...` line reference in these
   artifacts resolves against `openspec-cleanup`, not against this branch.** They are
   correct, and they do not resolve here.

2. **Archiving this change before `openspec-cleanup` merges would write a wrong main spec.**
   OpenSpec would create `api-key-credential-lifecycle` from this delta alone — three
   requirements rather than the eighteen the capability then holds — and leave a `TBD` purpose
   placeholder. `openspec validate --strict` does not catch this, because an `ADDED` delta
   does not require the target capability to exist.

**`openspec-cleanup` merges into `develop` before this work finishes** — confirmed by the
author on 2026-10-01. That branch exists to land those spec files, so this is sequencing
rather than new work. The only hard rule is the ordering: **do not archive this change until
that merge has landed.**

**One more delta is then owed.** The existing requirement "The credential list is returned
whole and filtered client-side" carries a scenario, "Filters compose with the text search",
that enumerates *environment, status and organization* explicitly. A fourth filter makes that
enumeration incomplete. Once the main spec is present, add a `MODIFIED` block for that
requirement extending the scenario to four filters. A `MODIFIED` block cannot be written now,
because it must reproduce a requirement body that is absent from this branch.

## Impact

**One component file, and one new test file.**

- Modified: `src/components/ApiKeyManagement/index.tsx` — four edits in one file:
  - a shared helper that returns a row's use types in canonical order,
  - a `UseTypesCell` component beside `StatusCell`, plus one new entry in the `columns`
    array (`:3190`),
  - one `PolicyField` in `RenewDialog` (`:1306`),
  - a fourth key on `ApiKeyFilters` plus a fourth `renderFilterSelect` call (`:1020`),
  - two added clauses in `filteredRows` (`:2917`) — one for the filter, one for the search.
- New: an `e2e/tests/` spec for the API keys page. `e2e/helpers/oktaLogin.ts` already
  provides the login step.
- Unchanged, deliberately: `ReissueDialog` (already displays use types) and
  `KeyCreatedDialog` (the token reveal).

**No API, database, or authorization change.** The column reads a field that
`GET /api/apikeys` already returns and that the row object already holds. That route is
already role-gated and already scoped to the caller's owned jurisdictions.

**No new data exposure.** A caller who can see a row receives that row's `useTypes` in the
JSON response today. This change renders a value the browser already has.

**The one real cost: the grid goes from nine columns to ten.** Every column uses `flex`, so
the existing columns each give up a little width. DESCRIPTION, ORGANIZATION, DNS and
CREATED BY are the ones that lose the most, and each keeps a `minWidth`, so the grid
scrolls horizontally on a narrow viewport rather than crushing a column. The alternative —
drop or hide a lower-value column such as CREATED BY to hold nine — was considered and
rejected: removing a column that operators use today is a larger behaviour change than a
narrower one.
