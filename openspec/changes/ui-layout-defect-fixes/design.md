## Context

See `proposal.md` for the five defects and where each one is in the code. This change only
touches presentation. It uses MUI v5 (`@mui/material` 5.18) and `@mui/x-data-grid` 7.29
community. `_app.tsx` wraps every page in `Layout`, which renders the left `Navigation`
and a `role="main"` box with `padding: 3` and `paddingTop: '3em'`.

The Home page undoes that padding with negative margins (`mt: -8`, `ml: -4`) and an
absolutely positioned, 100vh tall wrapper. It does this to get a full-bleed hero and the
footer. That wrapper is the root cause of defects 4 and 5.

## Goals / Non-Goals

**Goals:** fix the five acceptance criteria. Give the page frame (footer) a single owner.
Reuse fixes already proven elsewhere in the codebase (`borderTop: 'none'`,
`getRowHeight={() => 'auto'}`).

**Non-Goals:** no redesign of Home, the navigation or any grid. No MUI upgrade. No change
to the footer's content or wording. No cleanup of the brittle hashed-class selectors
(`.css-pqjvzy-…`) unless one of them blocks a fix.

## Decisions

1. **The footer moves into `Layout`, inside the main column.** A new
   `src/components/AppFooter/index.tsx` holds the markup that is now at
   `Home/index.tsx:426-490`. `Layout` renders it after `{children}`, inside the column to
   the right of `Navigation`, so it lines up with the content, as it does on Home today.
   *Alternative considered:* a full-width footer under the navigation too. Rejected: the
   navigation is a full-height sidebar, and spanning it would change the look of every
   page beyond what the ticket asks.

2. **Sticky footer through flex, not `position`.** The main column becomes
   `display: flex; flexDirection: column; minHeight: 100vh`. The page content box gets
   `flex: 1`, and the footer comes last. This pins the footer to the viewport bottom on
   short pages and lets it follow the content on long ones (spec: "The footer leaves no
   empty space below it"). The footer's own `position: sticky` / `bottom: -4` and Home's
   `position: absolute` / `height: 100vh` are removed. The content padding moves from the
   main box to an inner content box, so the footer can span the column's full width
   without negative margins.

3. **Home keeps its full-bleed hero with less hacking.** With the footer gone, Home no
   longer needs `position: absolute` or `height: 100vh`. Its negative margins against the
   layout padding stay only as far as the hero `Paper` needs them, and are checked
   visually. Home's background colour (`palette.background`) is applied to the content
   area, so the page looks the same.

4. **Banner image: remove the fixed wrapper height.** Change the wrapper at
   `Home/index.tsx:155-162` from `height: { xs: 120, md: 150 }` to an auto height, and keep
   `maxWidth: '100%', height: 'auto'` on the image. The image then defines its own box.
   *Alternative considered:* shrink the image to 150px tall. Rejected because it changes
   the artwork's size.

5. **STATUS cell: centre once, grow rows.** Wrap the cell content in one flex container
   with `alignItems: 'center'` and `height: '100%'`, and drop the three `mt: '1.5rem'`
   offsets. Add `getRowHeight={() => 'auto'}` with vertical cell padding on the
   ConnectionTable `DataGrid`, matching the API Keys grid. Keep the `<br />` in the
   scheduled message (start and end on separate lines reads well), now that the row grows
   to fit. Allow the maintenance `Typography` to wrap (`whiteSpace: 'normal'`), so a
   narrow column wraps it instead of clipping it.

6. **Pagination border: one rule per grid.** Add `borderTop: 'none'` to the
   `.MuiDataGrid-footerContainer` rule in ConnectionTable, TestReport, DenyList and
   FileTypeList. ConnectionTable's `CustomFooter` puts a `GridFooterContainer` (the
   selection bar) next to `GridFooter`. Both match the selector, so the one rule covers
   both. The fix is checked visually on each grid, because the stray line might also come
   from the `.MuiDataGrid-main` bottom border meeting the pill. If so, that border is the
   one to adjust.

## Risks / Trade-offs

- **Auto row height changes how ConnectionTable looks.** Rows without maintenance text
  may get slightly shorter or taller than `comfortable` density. → Set cell padding to keep
  the current height for single-line rows, and compare before/after screenshots.
- **The layout change touches every page.** → Check each page in the nav at 1920×1080 and
  at a mobile width. Pages that set their own `minHeight` or negative margins (Home, maybe
  Console) are the most likely to shift.
- **Jest jsdom suites cannot run** (`ERR_REQUIRE_ESM`, see `.claude/CLAUDE.md`), and jsdom
  does no layout anyway. → Verify with manual visual checks and the Playwright e2e specs.
