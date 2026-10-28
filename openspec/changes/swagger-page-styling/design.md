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
- No changes to the routes themselves. Two broken `@swagger` annotations are corrected (Decision 6); the rest are untouched.
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
   - **Info block:** keep the spec title, but restyle it smaller (1.25rem, bold,
     `primaryDark`) under the `PageHeader`, because the spec requires the real title and
     version to be visible. The version badges use `primary` and `secondary`.
   - **Method colours.** Border, summary background tint and method badge per method:

     | Method | Colour |
     |---|---|
     | GET | `primary` |
     | POST | `secondary` |
     | PUT | `warningAccessible` |
     | PATCH | `primaryDark` (not `secondaryLight`, which fails AA with white text at 2.3:1) |
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
   > to. Only GET requests can be run from this page; the other methods are documented
   > for reference.

   Page subtitle: *"Reference for the Configuration Console's internal API endpoints."*

6. **Fix the two broken route annotations.** While the spec was being built, swagger-jsdoc
   reported YAML errors in `api/changerequest/[...slug].ts` and
   `api/maintenance/update/[...slug].ts`. Both were missing the `parameters:` key, so both
   routes were silently left out of the documentation. The maintenance route was also
   documented as `delete`, while its handler only accepts `POST`. Fixing them adds the
   two missing routes (19 → 21 paths). This is a documentation-only edit; the handlers
   are unchanged.

7. **Normalize the generated spec instead of editing every route.** Two problems apply
   across many annotations, so the page fixes the spec after generation
   (`apiDocDefinition.ts`) and leaves the 22 route files alone:
   - No route declares `tags`, so Swagger UI grouped everything under "default".
     `tagUntaggedOperations` uses "IZ Gateway" instead. A route that adds real tags
     keeps them.
   - Four routes leave `application/json:` empty, which YAML reads as `null`, and
     Swagger UI crashes rendering it. `fillEmptyMediaTypes` replaces each one with `{}`.

8. **"Try it out" runs GET only.** It sends real requests to the connected environment,
   so `supportedSubmitMethods={['get']}` removes Execute from every other method.
   An info banner above Swagger names the host and `NEXT_PUBLIC_APP_ENV`. Reading the
   code, swagger-client calls the global `fetch` per request, so its requests go
   through the DPoP interceptor in `_app.tsx`. Task 1.2 still needs to confirm that in a
   browser.

9. **Header counts and Swagger settings.** The PageHeader shows GET, POST and DELETE
   counts, using API Key Management's stat card. It moved to a shared
   `src/components/StatCard`, now centred and counting up with the Console's
   `AnimatedNumber`. The final count is also exposed as `data-value` for tests. The
   other Swagger settings:
   - `deepLinking`
   - `displayRequestDuration`
   - `docExpansion="none"`
   - Schemas hidden
   - a loading skeleton

10. **Nav footer (added during implementation).** Swagger API and Log Out were
    underlined text at the bottom of the drawer. They are now a bottom row of small
    white icons under a divider, with a vertical divider between them. When the drawer
    is open, each icon shows its label. When it is collapsed, the icons have tooltips.
    `#logout`, the `/api-doc` link and the accessible names are unchanged.

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
