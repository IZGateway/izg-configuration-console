## Why

IGDD-3357: *"As a Config Console user, I want the Swagger/API documentation page styled
consistently with the rest of CC so that it feels integrated rather than a generic
third-party page."*

`/api-doc` (`src/pages/api-doc.tsx`) renders a bare `<SwaggerUI spec={spec} />` and
nothing else. Every other page in the console renders inside the same frame. That frame
is the header bar (`AppHeaderBar`), a title card (`PageHeader`, IGDD-3354), and for
pages reached outside the main flow a **Close** button (`Close`), as Admin Operations,
Connection History and Test Connection do. The Swagger page has none of these:

- **No way back.** There is no Close button. A user who opens the page from the "Swagger
  API" link at the bottom of the navigation drawer, or from the Home "OUR API" button,
  has to use the drawer or the browser's Back button to leave.
- **Generic styling.** The page uses swagger-ui's stock stylesheet: its own fonts, its
  own method colours (green GET, blue POST, orange PUT, red DELETE), square blocks and
  its own buttons. None of it uses the console's Ubuntu font, `palette` colours, rounded
  white cards or button style.
- **Placeholder content.** The spec's `info` block reads *"Next Swagger API"*, version
  *"1.0"*, with no description. The same placeholder appears with different text in two
  more places: `src/pages/api/swaggerjson.ts` (*"NextJS Swagger"*) and
  `src/next-swagger-doc.json` (*"NextJS Swagger" 0.1.0*). Nothing on the page tells a
  reader what the API is, who it is for, or how a request is authenticated.

The ticket refers to screenshots on IGDD-3281. They were not available when this
proposal was written; see Open questions in `design.md`.

## What Changes

- **The page frame.** `/api-doc` gains `AppHeaderBar`, a `PageHeader` with the title
  "API Documentation" and a subtitle, and the shared `Close` button in the same position
  as on Admin Operations. The access-denied branch is unchanged.
- **IZG styling for Swagger UI.** A wrapper around `<SwaggerUI>` applies scoped style
  overrides through MUI `sx`, with values from `palette`:
  - the console's font,
  - method colours mapped to the palette,
  - operation blocks as rounded white cards with the console's shadow,
  - the console's button style for "Try it out", "Execute" and "Cancel",
  - restyled section headings, tags and the models section.

  `swagger-ui-react/swagger-ui.css` stays the base. The overrides only restyle it, and
  they are scoped to the wrapper, so nothing leaks to other pages.
- **Descriptive content.** One shared `info` definition replaces the three placeholders.
  It gives a real title, "IZ Gateway Configuration Console API", the version from
  `package.json`, and a short description. The description covers what the API is for,
  that requests are authenticated with the console session, and that "Try it out" sends
  real requests to the current environment. The page subtitle carries a one-line summary.
- **No access change.** The page's client-side `canViewApiDoc` gate and its documented
  authorization debt (the spec embedded in the static payload, see the comment in
  `api-doc.tsx`) are unchanged.

## Capabilities

### New Capabilities

- `api-documentation-page`: the presentation of `/api-doc`. It covers the page frame
  (header bar, title card, Close button), IZG styling of the Swagger UI, and the spec's
  descriptive content.

### Modified Capabilities

None. `page-authorization` already covers who may view `/api-doc`, and that does not
change.

## Impact

- Modified: `src/pages/api-doc.tsx`, `src/pages/api/swaggerjson.ts` and
  `src/next-swagger-doc.json`.
- New: `src/lib/apiDocDefinition.ts`, the shared spec `info`, and
  `src/components/ApiDoc/swaggerStyles.ts`, the scoped style overrides.
- Two route annotations are corrected (`api/changerequest/[...slug].ts`,
  `api/maintenance/update/[...slug].ts`). They had YAML errors, so their routes were
  missing from the documentation. Only the comments change.
- **No API, data, auth or jurisdiction change.**
- **Security note:** "Try it out" sends real requests to the current environment.
  Swagger UI's HTTP client is expected to go through the global `fetch`, which the
  `_app.tsx` interceptor signs with a DPoP proof. That is not yet verified; task 1.2
  checks it. The new description says plainly that these are live requests, which matters
  because the page is available only to the IZG Operations and IZG Support roles.
