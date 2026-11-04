## ADDED Requirements

### Requirement: The API documentation page uses the console page frame

The API documentation page (`/api-doc`) SHALL render inside the same frame as other
console pages: the header bar, the shared page header with the title "API Documentation"
and a one-line subtitle, and the shared Close button. The access-denied render SHALL stay
as it is.

#### Scenario: Close button is present

- **GIVEN** a user permitted to view the API documentation
- **WHEN** the user opens `/api-doc`
- **THEN** a Close button SHALL be shown in the same position and style as on Admin
  Operations
- **AND** activating it SHALL take the user to the same destination as the Close button
  on other console pages

#### Scenario: Header bar and title card are present

- **WHEN** a permitted user opens `/api-doc`
- **THEN** the header bar SHALL be shown, as on other console pages
- **AND** the page SHALL show the shared page header with the title "API Documentation"
  as its `h1` and a subtitle under it

#### Scenario: Denied users still see the denial

- **GIVEN** a user without permission to view the API documentation
- **WHEN** the user opens `/api-doc`
- **THEN** the access-denied message SHALL be shown, unchanged

### Requirement: Swagger UI is styled to IZG's visual style

The Swagger UI on `/api-doc` SHALL use the console's visual style: its font, colours from
the shared palette, its card and button styles. The overrides SHALL be scoped to the API
documentation page and SHALL NOT change the styling of any other page.

#### Scenario: Console font and palette are applied

- **WHEN** a permitted user views `/api-doc`
- **THEN** Swagger UI text SHALL use the console's font
- **AND** headings, links and buttons SHALL use colours from the shared palette

#### Scenario: HTTP methods use palette colours

- **WHEN** the operation list renders
- **THEN** each HTTP method (GET, POST, PUT, PATCH, DELETE) SHALL be shown in a distinct
  palette colour, with text that meets WCAG AA contrast against its background

#### Scenario: Operations render as console cards

- **WHEN** the operation list renders
- **THEN** each operation block SHALL have rounded corners and the console's card shadow

#### Scenario: Styles do not leak

- **WHEN** the user leaves `/api-doc` for another page
- **THEN** that page SHALL look exactly as it did before this change

### Requirement: The API documentation carries descriptive content

The API specification SHALL have one shared `info` definition, used by every place that
builds the spec. It SHALL give a real title, the application version, and a description
that says what the API is for, how requests are authenticated, and that "Try it out" sends
live requests to the current environment.

#### Scenario: Real title and version

- **WHEN** a permitted user views `/api-doc`
- **THEN** the spec title SHALL read "IZ Gateway Configuration Console API"
- **AND** the version SHALL match the application version in `package.json`

#### Scenario: Live-request warning

- **WHEN** a permitted user views `/api-doc`
- **THEN** the description SHALL state that "Try it out" sends real requests to the
  environment the console is connected to

#### Scenario: One definition everywhere

- **WHEN** the spec is built by the page or by `/api/swaggerjson`
- **THEN** both SHALL read the same shared `info` definition
- **AND** the `swagger:generate-doc` script's JSON config, which cannot import code, SHALL
  carry the same title
