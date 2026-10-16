## ADDED Requirements

### Requirement: The main pages show the same application footer

The application SHALL render one shared footer on the main pages: Home and every page
listed in the navigation menu. The footer SHALL state the application version and build,
and the CDC authorisation notice with its link. A page SHALL NOT render its own copy of the
footer. Sub-pages that are reached from a main page, such as edit, history, test, change
request and test report, and the error pages SHALL NOT show the footer. The set of
navigation pages SHALL come from the navigation menu definition, so a page added to the
menu gets the footer without a separate change.

#### Scenario: The footer is present on a navigation page

- **GIVEN** an authenticated user
- **WHEN** the user navigates from Home to any page in the navigation menu, such as
  Manage Connections, API Keys or Access Control
- **THEN** the same footer SHALL be displayed on that page, with the same content and
  styling as on Home

#### Scenario: The footer is absent on a sub-page

- **WHEN** the user opens a page that is not Home and not in the navigation menu, such as
  Edit Connection, Connection History or the 404 page
- **THEN** no application footer SHALL be displayed

#### Scenario: The footer is not covered by the navigation

- **WHEN** any page renders, with the navigation drawer open or closed
- **THEN** the footer SHALL begin at the right edge of the navigation drawer, and none of
  its text, such as the leading "Version", SHALL be hidden behind the drawer

#### Scenario: The footer is rendered once

- **WHEN** any page renders
- **THEN** exactly one application footer SHALL be present in the document

### Requirement: The footer leaves no empty space below it

The footer SHALL sit at the bottom of the viewport when the page content is shorter than
the viewport, and SHALL follow the content when the content is taller. No empty page
background SHALL be visible below the footer.

#### Scenario: Short page on a large screen

- **GIVEN** a viewport taller than the page content, for example 1920×1080
- **WHEN** the page renders
- **THEN** the bottom edge of the footer SHALL align with the bottom edge of the viewport

#### Scenario: Long page

- **GIVEN** page content taller than the viewport
- **WHEN** the user scrolls to the bottom
- **THEN** the footer SHALL appear directly after the content, and the document SHALL end
  at the footer's bottom edge

### Requirement: Connection status text is aligned and fully readable

In the Manage Connections grid, the STATUS cell SHALL use one vertical alignment for every
status variant: Connected, Not Connected, Circuit Breaker Thrown, Under Maintenance and
Scheduled Maintenance. Maintenance messages SHALL be fully visible, including their start
and end dates and times, without clipping.

#### Scenario: Active maintenance is aligned with other statuses

- **GIVEN** a connection under active maintenance and a connected connection in the same
  grid page
- **WHEN** the grid renders
- **THEN** both status texts SHALL be vertically aligned the same way within their rows

#### Scenario: Scheduled maintenance message is not clipped

- **GIVEN** a connection with a future maintenance window
- **WHEN** the grid renders
- **THEN** the full message, from "This connection will be under maintenance from" to the
  end time, SHALL be visible within the row, and the row SHALL grow to fit it

#### Scenario: Card view maintenance banner is readable

- **GIVEN** the Manage Connections page in its card layout
- **WHEN** a connection is under maintenance or has maintenance scheduled
- **THEN** the maintenance banner text SHALL be fully visible and aligned within the banner

### Requirement: Images do not overlap adjacent content

An image SHALL take up its full rendered size in the layout. Its container SHALL NOT be
sized smaller than the image in a way that lets the image overflow into neighbouring
content.

#### Scenario: Home banner image at desktop width

- **GIVEN** the Home page at a width of 900px or more
- **WHEN** the page renders
- **THEN** the banner image SHALL NOT overlap the cards or any other content below or
  beside it

#### Scenario: Home banner image at mobile width

- **GIVEN** the Home page at a width below 900px
- **WHEN** the page renders
- **THEN** the banner image SHALL scale to the available width and SHALL NOT overlap
  adjacent content

### Requirement: Grid pagination controls render without stray lines

Every data grid that restyles its pagination footer SHALL suppress the grid's default
footer top border, so that no line is drawn across or beside the pagination control.

#### Scenario: Pagination footer on each data grid

- **WHEN** any of the Manage Connections, Test Report, Deny List, File Type List,
  Onboarding or API Keys grids renders its pagination control
- **THEN** no border line SHALL be drawn across the top of the pagination control, beyond
  the control's own intended outline

### Requirement: Navigation pages share one header style with a subtitle

Every page reachable from the navigation menu (Manage Connections, Admin Operations,
Access Control, Onboarding Senders, Console and API Key Management) SHALL open with the
shared page header: a white card holding the page title as a level-1 heading and a
one-line subtitle that describes the page. Every page SHALL use the same type scale,
colour and spacing for the title and the subtitle. Page-specific controls, such as the API
key stat cards or the Console refresh button, SHALL sit on the right of the header on
wide screens and below the title on narrow screens.

#### Scenario: Each navigation page shows a title and a subtitle

- **WHEN** a user opens any page in the navigation menu
- **THEN** the page SHALL show its title as an `h1` heading in the shared header card
- **AND** a subtitle SHALL appear directly under the title

#### Scenario: Headers look the same across navigation pages

- **WHEN** a user moves between any two navigation pages
- **THEN** the title and subtitle SHALL have the same font size, weight, colour and
  padding on both pages

#### Scenario: Existing title locators keep working

- **WHEN** an automated test locates a page title by its existing `id` (for example
  `#title-table` or `#operations-console`) or by its title text
- **THEN** the locator SHALL still resolve to the page title

### Requirement: One loading indicator covers the whole screen

The application SHALL use a single loading indicator, the IZG logo inside a spinning
ring, both during a page change and for full-screen loading within a page. While it is
shown, its overlay SHALL cover the entire screen, including the navigation drawer and the
header bar.

#### Scenario: Slow page change

- **WHEN** a client-side page change takes longer than 250 ms
- **THEN** the logo indicator SHALL appear over a dimmed overlay that covers the
  navigation drawer, the header bar and the page content

#### Scenario: In-page loading uses the same indicator

- **WHEN** a page shows its full-screen loader, for example while Access Control loads or
  an Admin Operations action runs
- **THEN** it SHALL show the same logo indicator as a page change
