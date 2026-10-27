## Context

See `proposal.md`. `/api-doc` exports `getStaticProps`. It builds the spec at build time
with `createSwaggerSpec` and renders it client-side through
`dynamic(import('swagger-ui-react'), { ssr: false })`. It imports
`swagger-ui-react/swagger-ui.css` directly. Access is gated client-side by
`useRoleAccess('api-doc').canViewApiDoc`, which allows the IZG Operations and IZG Support
roles.

Reusable pieces already on `develop` (IGDD-3354):
- `AppHeaderBar` (`src/components/AppHeader`)
- `PageHeader` (`src/components/PageHeader`): title, subtitle, actions slot
- `Close` (`src/components/Close`): pushes `/manageconnections`
- `palette` (`src/styles/theme/palette.ts`), plus the theme font (Ubuntu, via
  `@fontsource/ubuntu` and `globals.css`)

## Goals / Non-Goals

**Goals:** a Close button, IZG styling for Swagger UI, and real descriptive content. All
three are scoped to `/api-doc`.

**Non-Goals:**
- No change to access control, and no fix for the embedded-spec authorization debt, which
  is documented in `api-doc.tsx` and tracked as an `AUTHZ_DEBT` row.
- No edits to the 22 route `@swagger` annotations.
- No Swagger UI upgrade, and no swap to another renderer (Redoc etc.).
- No footer. `/api-doc` is not a navigation menu page. IGDD-3354 limits the footer to Home
  and the menu pages.

## Decisions

1. **Frame with existing components.** Render `<Close />`, `<AppHeaderBar open />` and
   `<PageHeader title="API Documentation" subtitle=… />` above the Swagger wrapper, in the
   same order Admin Operations uses. `Close` keeps its current behaviour: it navigates to
   `/manageconnections`, like every other `Close`. *Alternative:* `router.back()`.
   Rejected for this change, because it would make this one Close button behave unlike the
   others. If the team wants "back" semantics, that belongs to the shared component.

2. **Scoped overrides through MUI `sx`, not a global stylesheet.** Put the overrides in
   `src/components/ApiDoc/swaggerStyles.ts` as an `SxProps` object, applied to a `Box`
   that wraps `<SwaggerUI>`. Every selector is nested under that box (`'& .swagger-ui
   .opblock'` …), so nothing leaks, and the values come from `palette`. Next's Pages
   Router only allows global CSS imports in `_app.tsx`, which would apply to every page,
   and a CSS module can't target the third-party class names without `:global`. `sx`
   keeps the overrides typed, scoped, and in the same idiom as the rest of the code.

3. **What gets restyled.** Selectors refer to swagger-ui 5's DOM.
   - **Font:** `.swagger-ui`, `.swagger-ui .info .title`, `.opblock-tag` and
     `.opblock-summary` → the theme's Ubuntu stack.
   - **Info block:** hide `.information-container .info .title`. `PageHeader` already
     shows the title, and repeating it is noise. Keep the description and version.
   - **Method colours.** Border, summary background tint and method badge per method:

     | Method | Colour |
     |---|---|
     | GET | `primary` |
     | POST | `secondary` |
     | PUT | `warningAccessible` |
     | PATCH | `secondaryLight` |
     | DELETE | `error` |

     The badge text is white on each colour, and each pair is checked for WCAG AA.
   - **Operation cards:** `.opblock` gets an 8px radius, the `PageHeader` shadow and a
     white background.
   - **Buttons:** `.btn`, `.btn.execute` and `.btn.cancel`, plus `.try-out__btn`, match
     MUI contained and outlined buttons, with the 50px radius used elsewhere.
   - **Tags and models:** `.opblock-tag` and `.models` use the console's heading weight
     and the `divider` colour for rules.

4. **One `info` definition.** `src/lib/apiDocDefinition.ts` exports the OpenAPI
   `definition`: `openapi`, plus `info` with the title, `version: pack.version` and a
   Markdown `description`. Both `api-doc.tsx` and `api/swaggerjson.ts` spread it into
   `createSwaggerSpec`. `next-swagger-doc.json` is static JSON for the CLI and can't
   import, so its title and version are updated by hand to match.

5. **Description text (draft, for review):**
   > Internal API behind the IZ Gateway Configuration Console. It manages destinations
   > and change requests, connection tests, access control, onboarding, and API keys.
   >
   > **Authentication:** requests use your signed-in console session. Every request
   > carries a DPoP proof that is bound to this browser session.
   >
   > **"Try it out" sends real requests** to the environment this console is connected
   > to. Changes made here take effect immediately.

   Page subtitle: *"Reference for the Configuration Console's internal API endpoints."*

## Risks / Trade-offs

- **swagger-ui class names are not a public API.** A future `swagger-ui-react` upgrade
  could rename them, and the overrides would then quietly stop applying. → Keep the
  selectors in one file with a comment naming the swagger-ui version they target.
- **DPoP and "Try it out".** If Swagger UI's client does not go through the global
  `fetch`, its requests carry no proof, and the middleware redirects them to sign-in.
  This is pre-existing behaviour, but the new description promises that requests work. →
  Task 1.2 checks it. If it fails, drop that sentence and note it on the ticket.
- **Jest can't verify styling.** jsdom does no layout, and the jsdom suites hit the known
  `ERR_REQUIRE_ESM` failure. → Verify visually, plus the existing
  `e2e/tests/navbar.spec.ts` check of the `/api-doc` link.

## Open Questions

- **IGDD-3281 screenshots.** The ticket points at them as the visual reference, and they
  were not available while writing this design. Confirm that the decisions above match
  them before or during implementation.
- **Close destination.** Is `/manageconnections`, the shared behaviour, right for this
  page, or should Close return to where the user came from (Home or the drawer link)?
