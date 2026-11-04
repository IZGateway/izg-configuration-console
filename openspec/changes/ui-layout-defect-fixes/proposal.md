## Why

IGDD-3354: *"As a Config Console user, I want visual layout defects fixed so that the UI is
readable and behaves consistently across pages."* The ticket lists five defects. Each one
traces to a specific place in the code. The ticket does not name a location for defects 1
and 2. The requester confirmed on 2026-10-15 that the "Under Maintenance" banner is the
Manage Connections STATUS cell and that the overlapping image is the Home page banner.

1. **The maintenance status text is misaligned and clipped.** On the Manage Connections
   grid, the STATUS cell renders "Connected", "Not Connected" and "Circuit Breaker Thrown"
   with `mt: '1.5rem'` to push them down to the row's centre line
   (`ConnectionTable/index.tsx:634`, `:658`, `:675`). The two maintenance messages, "This
   connection is under maintenance until …" and "This connection will be under maintenance
   from … until …", have no such offset (`:586`, `:612`), so they sit higher than every
   other status. The future-maintenance message is also forced onto two lines by a `<br />`
   (`:596`), and the grid uses fixed `comfortable` row height with no `getRowHeight`, so
   the second line is cut off.
2. **The Home banner image overlaps the content below it.** The image is 300×180
   (`Home/index.tsx:166`), but its wrapper box is fixed at `height: { xs: 120, md: 150 }`
   (`:157`). The 30–60px of overflow runs into the cards below.
3. **The pagination control has a stray line.** MUI's `.MuiDataGrid-footerContainer`
   draws a 1px `border-top` by default. On ConnectionTable and TestReport, the footer is
   restyled as a floating rounded pill (`ConnectionTable/index.tsx:166`,
   `TestReport/index.tsx:53`), and the default border stays, so a line runs across the top
   of the pill. API Keys (`ApiKeyManagement/index.tsx:609`, `:1964`) and Onboarding
   (`Onboarding/index.tsx:65`) already set `borderTop: 'none'`. DenyList and FileTypeList
   do not.
4. **There is extra empty space below the footer on large screens.** The footer exists
   only inside the Home component. Home wraps the whole page in a box with
   `position: 'absolute'` and `height: '100vh'` (`Home/index.tsx:57-65`), and the footer
   is `position: sticky` with `bottom: -4` (`:427-437`). When the content is shorter than
   the viewport, the footer stops right after the content and the 100vh box shows empty
   background beneath it.
5. **The footer appears on Home only.** No other page renders it, and `Layout.tsx` has no
   footer slot.

None of this blocks a task, but readable status text and a consistent page frame are
basic quality, and the maintenance message is safety-relevant: an operator must be able to
read when a connection's maintenance window ends.

## What Changes

- **STATUS cell alignment.** All status variants on the desktop grid share one vertically
  centred layout. The per-variant `mt: '1.5rem'` offsets go away. The maintenance messages
  are fully visible: the status column's rows grow to fit (`getRowHeight` → `'auto'`, the
  same approach the API Keys grid already uses), and text wraps instead of being clipped.
  The mobile card's maintenance banner (`ConnectionTable/index.tsx:847-867`) is checked
  for the same issue, and fixed if it has one.
- **Home banner image.** The wrapper box stops fixing a height smaller than the image.
  The image keeps its aspect ratio and takes up its full height in the layout.
- **Pagination footer border.** Every DataGrid that restyles its footer removes the
  default `border-top` on `.MuiDataGrid-footerContainer`. This uses the
  `borderTop: 'none'` rule that API Keys and Onboarding already use. Grids affected:
  ConnectionTable, TestReport, DenyList and FileTypeList.
- **A shared `AppFooter`.** The version and CDC authorisation footer moves out of
  `Home/index.tsx` into a new `src/components/AppFooter` component. `Layout.tsx` renders
  it on Home and on every page in the navigation menu, so the main pages share the same
  footer. Sub-pages (edit, history, test, change request, test report) and the error pages
  do not show it. The requester set this scope on 2026-10-15.
- **The footer sits at the bottom of the viewport.** `Layout` becomes a sticky-footer
  layout: the main column is a flex column, the page content takes `flex: 1`, and the
  footer follows it. On a short page, the footer sits at the bottom of the viewport. On a
  long page, it comes after the content. There is never empty space below it. The Home
  page's `position: absolute` / `height: 100vh` wrapper and the sticky footer go away.

## Capabilities

### New Capabilities

- `app-layout`: the shared page frame (the footer on every page and where it sits, and
  one header style with a title and subtitle on every navigation page, added at the
  requester's direction on 2026-10-15) and
  the visual rules for cross-page widgets (grid pagination footer, status cell
  readability, images that stay inside their own area).

### Modified Capabilities

None.

## Impact

- Modified: `src/components/Layout.tsx`, `src/components/Home/index.tsx`,
  `src/components/ConnectionTable/index.tsx`, `src/components/TestReport/index.tsx`,
  `src/components/AccessControl/DenyList.tsx`,
  `src/components/AccessControl/FileTypeList.tsx`.
- New: `src/components/AppFooter/index.tsx`.
- `e2e/tests/home.spec.ts` "Verify footer quick links" checks the Home quick-link cards,
  not the version footer, so the move should not affect it. Its run confirms that.
- **No API, data, auth or jurisdiction change.** This is presentation only. The footer
  reads `package.json` version and `NEXT_PUBLIC_BUILD_ID`, both of which Home already
  reads on the client.
- The ticket's reference to the IZG Personas Confluence page does not affect scope. The
  defects apply to every persona alike.
