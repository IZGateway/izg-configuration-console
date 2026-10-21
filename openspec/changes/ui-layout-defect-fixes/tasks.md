## 1. Baseline

- [ ] 1.1 Run the app locally and capture before screenshots at 1920×1080 and 390×844 of
  Home, Manage Connections (with one connection under active maintenance and one with
  maintenance scheduled), Test Report, Access Control (Deny List and File Type List),
  Onboarding and API Keys.

## 2. Shared footer and layout

- [x] 2.1 Create `src/components/AppFooter/index.tsx` with the footer markup moved from
  `src/components/Home/index.tsx:426-490` (version/build line and CDC notice with logo
  link). Drop `position: sticky`, `bottom` and `ml: -4`.
- [x] 2.2 Update `src/components/Layout.tsx`: make the main column a flex column with
  `minHeight: '100vh'`, move the content padding to an inner box with `flex: 1`, and render
  `<AppFooter />` after it.
- [x] 2.3 Remove the footer from `Home/index.tsx`, along with the wrapper's
  `position: 'absolute'` and `height: '100vh'`. Adjust the negative margins so the hero
  still runs full-bleed and the background colour still fills the content area.
- [ ] 2.4 Check every nav page at 1920×1080: exactly one footer, aligned to the viewport
  bottom on short pages, after the content on long pages, with no empty space below.

## 3. Home banner image

- [x] 3.1 In `Home/index.tsx:155-162`, replace the fixed `height: { xs: 120, md: 150 }`
  with an auto height. Verify at desktop and mobile widths that the image no longer
  overlaps the cards below.

## 4. Connection STATUS cell

- [x] 4.1 In `ConnectionTable/index.tsx` STATUS `renderCell`, put all variants in one
  vertically centred flex container and remove the three `mt: isMobile ? 0 : '1.5rem'`
  offsets.
- [x] 4.2 Let the maintenance messages wrap, and add `getRowHeight={() => 'auto'}` with
  vertical cell padding to the desktop `DataGrid`. Keep single-line rows close to their
  current height.
- [ ] 4.3 Check the mobile card maintenance banner (`:847-867`) for alignment and
  readability, and fix it if needed.

## 5. Pagination stray line

- [x] 5.1 Add `borderTop: 'none'` to the `.MuiDataGrid-footerContainer` rule in
  `ConnectionTable/index.tsx`, `TestReport/index.tsx`, `AccessControl/DenyList.tsx` and
  `AccessControl/FileTypeList.tsx`.
- [ ] 5.2 Check each grid's pagination visually, including Onboarding and API Keys. If a
  line remains, find its source (for example the `.MuiDataGrid-main` border) and fix it
  there.

## 6. Verification

- [ ] 6.1 `npm run code-quality-check` passes (lint + `tsc --noEmit`).
- [ ] 6.2 `npm run test`. Record the result. The jsdom suites have a known pre-existing
  `ERR_REQUIRE_ESM` failure (`.claude/CLAUDE.md`), so report failures in changed areas
  separately from that known failure.
- [ ] 6.3 Run the e2e specs `home.spec.ts`, `navbar.spec.ts` and `manageConnection.spec.ts`
  locally (`BASE_URL=<local url>`) and confirm they still pass.
- [ ] 6.4 Capture after screenshots that match 1.1 and compare them against each
  acceptance criterion in IGDD-3354.

## 7. Navigation page headers

- [x] 7.1 Create `src/components/PageHeader/index.tsx`: a white shadow card with an `h1`
  title (1.75rem, bold), a `body2` subtitle in `palette.greyText`, an optional `actions`
  slot, and `id`/`sx` pass-through.
- [x] 7.2 Use it on the six navigation pages: ConnectionTable, ApiKeyManagement (stat
  cards as actions), AccessControl, Onboarding, Console (Refresh as actions) and
  AdminOperations. Keep each page's title text and `id`, and keep each page's bottom
  margin (`-16px` where the grid tucks under the card).
- [x] 7.3 Add subtitles where a page had none: Manage Connections and Access Control.
- [ ] 7.4 Check each navigation page at desktop and mobile widths: same header style,
  subtitle present, and actions laid out correctly.

## 8. Loading indicator

- [x] 8.1 Extract the IZG logo and ring into `src/components/Loader/LogoSpinner.tsx`, and
  use it in both `NavigationLoader` and `Loader`, so in-page loading shows the same
  indicator as page changes.
- [x] 8.2 Raise both overlays to `theme.zIndex.modal + 1`, so they cover the navigation
  drawer and header bar.
- [x] 8.3 Fix the `NavigationLoader` cleanup, which called `clearTimeout(timer.current)`
  on a plain timeout ID.
- [ ] 8.4 Check a slow page change and an in-page load (Access Control, Admin Operations):
  the whole screen dims and the logo indicator shows.
- [x] 8.5 Replace the bare "Loading..." text with `Loader/PageLoading` (the logo indicator):
  full screen on the `greyLight` background in the `_app.tsx` auth gate, and in the
  content area for the router-not-ready fallbacks on Console, History and Edit.
