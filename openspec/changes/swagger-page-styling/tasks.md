## 1. Baseline

- [ ] 1.1 Start the app locally, open `/api-doc` as an IZG Operations user, and capture a
  before screenshot at 1920×1080 and at a mobile width.
- [ ] 1.2 Expand one GET operation, click "Try it out" and "Execute", and confirm in the
  dev server log that the request carried a DPoP proof, meaning it was not redirected to
  sign-in. Record the result. It decides the wording of the description (design Risks).
- [ ] 1.3 Compare the IGDD-3281 screenshots with design Decision 3, and adjust the
  decision if they differ.

## 2. Descriptive content

- [x] 2.1 Create `src/lib/apiDocDefinition.ts`, exporting the OpenAPI `definition` with
  `info.title` "IZ Gateway Configuration Console API", `info.version` from
  `package.json`, and the Markdown description from design Decision 5.
- [x] 2.2 Use it in `src/pages/api-doc.tsx` and `src/pages/api/swaggerjson.ts` in place of
  their inline `definition`.
- [x] 2.3 ~~Update `src/next-swagger-doc.json` to the same title and version.~~
  Replaced: `swagger:generate-doc` now runs `scripts/generate-swagger-doc.ts`, which
  uses `buildApiDocSpec()`, and the static config is removed.

## 3. Page frame

- [x] 3.1 In `api-doc.tsx`, render `<Close />`, `<AppHeaderBar open />` and
  `<PageHeader title="API Documentation" subtitle=… />` above Swagger UI, in the order
  Admin Operations uses. Leave the loading and access-denied branches unchanged.
- [ ] 3.2 Check that Close navigates to `/manageconnections` and that the denial still
  renders for a role without `canViewApiDoc`.

## 4. Swagger styling

- [x] 4.1 Create `src/components/ApiDoc/swaggerStyles.ts` with the scoped `sx` overrides
  from design Decision 3: font, restyled info title, method colours, card radius and
  shadow, buttons, tags and models. Add a comment naming the swagger-ui version.
- [x] 4.2 Wrap `<SwaggerUI>` in a `Box sx={swaggerStyles}`.
- [x] 4.3 Check WCAG AA contrast for each method badge (white text on the palette colour)
  and for link and button text.
- [ ] 4.4 Open another page after `/api-doc` and confirm its styling is unchanged.
- [x] 4.5 Fix the YAML errors in the `api/changerequest/[...slug].ts` and
  `api/maintenance/update/[...slug].ts` annotations (missing `parameters:`; maintenance
  documented as `delete` instead of `post`), so both routes appear (19 → 21 paths).

## 4a. Added during implementation

- [x] 4a.1 Group untagged endpoints under "IZ Gateway" and replace null media types in
  the generated spec (design Decision 7).
- [x] 4a.2 Limit "Try it out" to GET, and add the host and environment banner (Decision 8).
- [x] 4a.3 Add header method counts through a shared, count-up `StatCard`, plus the
  Swagger display settings (Decision 9). Update `apiKeyRevoke.spec.ts` to read
  `data-value`.
- [x] 4a.4 Rework the nav footer into a labelled icon row (Decision 10). Update
  `navbar.spec.ts` to check accessible names.

## 5. Verification

- [ ] 5.1 `npx tsc --noEmit` passes, and `npm run code-quality-check` passes on Node 22
  or newer.
- [ ] 5.2 Run `e2e/tests/navbar.spec.ts` locally; it checks the `/api-doc` link.
- [ ] 5.3 Capture after screenshots matching 1.1 and check each IGDD-3357 acceptance
  criterion against them.
