## Why

The API keys grid shows nine columns. Not one of them shows the use types a credential
carries. A credential's use types decide which data populations it can submit, so the
operator who debugs a rejected submission cannot see the field that most often explains
the rejection.

Use types reach the UI in two places today, and neither answers "what is this key scoped
to?":

- The Create form picker collects them (`ApiKeyManagement/index.tsx:2394`). That is input,
  not display.
- The Re-issue confirm dialog displays them (`index.tsx:1652`), and only for a key that is
  already expired.

The **View key** dialog omits them. It shows Organization, Environment, Description,
Status, Created, Expires, Created By and Key ID (`index.tsx:579`).

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
the View key dialog does not show use types. The status stays as it is, by decision. The
two tickets are now linked as related, and item 2 below is the work that closes the gap
IGDD-3338 describes.

## What Changes

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

- **No data-layer change.** The grid row already carries `useTypes: AllowedUseType[]`
  (`index.tsx:265`, populated at `:431`), and `USE_TYPE_LABELS` already maps each value to a
  human-readable label (`lib/type/AllowedUseType.ts`).

### Scope that waits on the team

Three adjacent items are posted to IGDD-3460 as comment 116513 and wait for an answer. All
three are cheap, because the row already carries the data and the grid filters client-side.
They are **not** in the delta spec below. When the team answers, `/opsx:update` folds the
confirmed items into these artifacts.

2. **The View key dialog** gains a Use Types field. This is the work that closes the gap
   IGDD-3338 describes.
3. **A Use Types filter** — a fourth `Select` in the custom filter popover, next to
   Environment, Status and Organization.
4. **The search box** matches use-type labels. It matches key id, description, organization,
   DNS and environment today (`index.tsx:2919`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `api-key-credential-lifecycle`: gains one new requirement, **"A credential's use types are
  visible in the keys grid"**.

  The capability's existing requirement, "Use types are captured and validated on the
  credential" (`openspec/specs/api-key-credential-lifecycle/spec.md:393`), covers capture,
  validation, how renewal and re-issue each source the values, and how the Create dialog
  narrows the picker to the organization's registration. It says nothing about where a user
  reads a credential's use types after creation.

  The delta uses `ADDED` rather than `MODIFIED` on that requirement, because display is a
  new concern and no existing scenario changes behaviour. A partial `MODIFIED` block loses
  detail at archive time, and every scenario in the existing requirement stays true.

## Impact

**One component file, and one new test file.**

- Modified: `src/components/ApiKeyManagement/index.tsx` — one new entry in the `columns`
  array (`:3190`) and a small `UseTypesCell` component beside `StatusCell`.
- New: an `e2e/tests/` spec for the API keys grid. `e2e/helpers/oktaLogin.ts` already
  provides the login step.

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
