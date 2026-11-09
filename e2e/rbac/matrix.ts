import { RoleName } from './roles'

/**
 * The CC rows of the target RBAC matrix, as data (IGDD-3621).
 *
 * Source: Confluence "Role Based Access Control for IZ Gateway" (IGDD space,
 * page 1006043137), Combined Matrix, App = CC. Hub rows are out of scope,
 * and so are the CDC Operations and CDC Support columns: those roles are not
 * planned (see roles.ts). `allow` lists the remaining roles only.
 *
 * Keeping it current: this file changes in the PR of the ticket that changes
 * access, never on its own. When a ticket grants or removes a capability,
 * update `allow` to the page's new target, remove any `knownGaps` entry the
 * ticket closes, and bump MATRIX_SOURCE.version if the page moved on. The
 * report flags a known gap that now passes as GAP CLOSED, so a forgotten
 * entry shows up on the next run.
 *
 * Probes must never change data, even when the gate they test is broken.
 * Each probe is one of:
 *  - a read (GET);
 *  - a method the handler does not implement, on a route whose authorization
 *    is method-agnostic (`capability:` declarations check every method), so
 *    the gate decides and the handler then refuses;
 *  - a sentinel id or an empty body that the handler rejects before any write;
 *  - `denyOnly`: sent only for roles the matrix denies, for a request that
 *    would act on real data if allowed. The gate should refuse it, but a
 *    `denyOnly` probe must also be one the handler rejects before any read
 *    or write, so that a broken gate still changes nothing. Say how in the
 *    row. Global-reach roles pass hasAccessToDestId for any destination, so
 *    a missing `destId` does not stop them.
 *
 * Each probe names its gate's `refusal` status, so a handler's own 401
 * after the gate let the request through (a missing record, no destination)
 * is not mistaken for the gate refusing it. On a `byMethod` route, probe a
 * declared method: an undeclared one is answered 405 before any role check.
 *
 * UI checks (`ui`) open a page and look for a control; they never click an
 * action, only menus that reveal one. Where hiding the control is the only
 * protection, the row sets `uiOnly`: a correctly hidden control is then
 * still reported as a known gap for the roles the target denies, because
 * the server would let them do it anyway.
 */

export const MATRIX_SOURCE = {
  page: 'Role Based Access Control for IZ Gateway',
  pageId: '1006043137',
  version: 13,
} as const

/** Where a probe's destination comes from. See probes.ts `resolveDestination`. */
export type DestinationKind = 'own' | 'foreign'

export interface ApiProbe {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /**
   * Route path. `{dest}` expands to `<typeId>/<destId>`, and `{typeId}` and
   * `{destId}` to the parts, from the destination named by `dest`.
   */
  path: string
  /** JSON body. A string value of exactly `'{destId}'` is expanded too. */
  body?: Record<string, unknown>
  /** The probe acts on a destination. Required when the path or body uses one. */
  dest?: DestinationKind
  /** Set when the probe must not be sent for an allowed role; the reason why. */
  denyOnly?: string
  /**
   * The status the route's gate refuses with: 403 for `capability` and
   * `byMethod` declarations and `checkAdmin`, 401 for the reach checks
   * (`checkAccessToDestId*`) and for handlers that answer 401 themselves.
   * Read the route before setting it.
   */
  refusal: 401 | 403
}

/**
 * What a destination must hold for a UI control to appear at all: a
 * submitted change request (it has a Jira ticket), a saved draft (no ticket
 * yet), neither, or any of these.
 */
export type DestinationState = 'changeRequest' | 'draft' | 'idle' | 'any'

/**
 * A control the UI shows only to roles holding the capability. The
 * destination is one the role reaches in the needed `state`, preferring the
 * fixture (E2E_RBAC_FIXTURE_DEST, default `al`). In `page`, `control`,
 * `ready` and `open`, `{dest}` expands to `<typeId>/<destId>`, and
 * `{typeId}` and `{destId}` to the parts.
 */
export interface UiProbe {
  page: string
  state: DestinationState
  /** The control. Use `[id="..."]`: some ids start with a digit. */
  control: string
  /**
   * Always on the page once it has loaded, so a missing control means
   * hidden, not still loading. Without one, only the denial screen or the
   * control itself decides.
   */
  ready?: string
  /** Clicked before looking for the control: a menu, never an action. */
  open?: string
}

/**
 * Data a page sends in its props (the `__NEXT_DATA__` payload) that only
 * allowed roles should receive. A client-side gate can hide the interface
 * while the payload still carries the data: this checks the payload.
 */
export interface PageDataProbe {
  page: string
  /** Key under `pageProps`; present and non-empty means the role got it. */
  prop: string
}

export interface KnownGap {
  /** Ticket that closes the gap, if one exists. */
  ticket?: string
  reason: string
}

export interface MatrixRow {
  /** Stable key, used in the report and by `knownGaps` reviewers. */
  id: string
  /** The Confluence "Feature — Capability" cell. */
  feature: string
  /** Roles the target matrix grants. */
  allow: readonly RoleName[]
  /** Nav drawer links (`#navigation a[href=...]`) that appear iff allowed. */
  nav?: readonly string[]
  /** Pages that render iff allowed, or show the access-denied screen. */
  pages?: readonly string[]
  api?: readonly ApiProbe[]
  /** Controls that appear iff allowed. */
  ui?: readonly UiProbe[]
  /** Page payload data that is sent iff allowed. */
  pageData?: readonly PageDataProbe[]
  /**
   * For jurisdiction roles: also check that /api/destinations lists only
   * the jurisdictions in the session.
   */
  checksDestinationList?: boolean
  /**
   * Set when hiding the control is the only protection: no server check
   * reads the capability. A role the target denies is then a known gap even
   * when the control is hidden. Remove it in the PR that adds the server
   * check, along with an `api` probe for it.
   */
  uiOnly?: KnownGap
  /** The row only applies while this release flag is on. */
  requiresFlag?: 'apiKeyManagement'
  /** Open to any signed-in user by design, so roles outside `allow` get it too. */
  openToAnySignedInUser?: boolean
  /** Cells where today's code is known to differ from the target. */
  knownGaps?: Partial<Record<RoleName, KnownGap>>
  /** Set when no probe can test the row safely yet; the reason why. */
  notAutomated?: string
}

// Column shorthands, in Confluence column order.
const IZG_SEC: RoleName = 'IZG Security'
const JUR_SEC: RoleName = 'Jurisdiction Security'
const IZG_OPS: RoleName = 'IZG Operations'
const JUR_OPS: RoleName = 'Jurisdiction Operations'
const IZG_SUP: RoleName = 'IZG Support'
const JUR_SUP: RoleName = 'Jurisdiction Support'
const IZG_PRG: RoleName = 'IZG Program'

const ALL_TARGET_ROLES: readonly RoleName[] = [
  IZG_SEC, JUR_SEC, IZG_OPS, JUR_OPS, IZG_SUP, JUR_SUP, IZG_PRG,
]
const ALL_BUT_PROGRAM: readonly RoleName[] = ALL_TARGET_ROLES.filter((r) => r !== IZG_PRG)
const SECURITY_AND_OPS: readonly RoleName[] = [IZG_SEC, JUR_SEC, IZG_OPS, JUR_OPS]
const IZG_SEC_AND_OPS: readonly RoleName[] = [IZG_SEC, IZG_OPS]

/** IZG Operations still holds what the target moves to IZG Security. */
const MOVES_TO_IZG_SECURITY: KnownGap = {
  ticket: 'IGDD-3495',
  reason:
    'Target moves this to IZG Security. IZG Operations keeps it until IZG Security exists.',
}
/** API key access moves from the Operations roles to the Security roles. */
const API_KEYS_MOVE_TO_SECURITY: Partial<Record<RoleName, KnownGap>> = {
  'IZG Operations': MOVES_TO_IZG_SECURITY,
  'Jurisdiction Operations': {
    ticket: 'IGDD-3500',
    reason: 'Target moves API keys to Jurisdiction Security.',
  },
}

// Gap reasons stay short and point at the ticket: this repo is public, and
// the ticket holds the detail.

/** Recorded in authzDebt.ts. */
const EDIT_PAGE_NOT_ENFORCED: KnownGap = {
  ticket: 'IGDD-3472',
  reason: 'Not enforced by role yet.',
}
const EDIT_PAGE_GAPS: Partial<Record<RoleName, KnownGap>> = {
  'IZG Support': EDIT_PAGE_NOT_ENFORCED,
  'Jurisdiction Support': EDIT_PAGE_NOT_ENFORCED,
  'IZG Program': EDIT_PAGE_NOT_ENFORCED,
}

/**
 * IZG Program's two Manage Connections links are off in code on purpose:
 * each opens a page this role's matrix row denies (_IZGProgramAccess.ts).
 */
const PROGRAM_LINK_HELD_BACK: KnownGap = {
  ticket: 'IGDD-3547',
  reason: 'Not yet granted: held back until the matrix intent is clarified.',
}

/** The /api-doc spec reaches every signed-in user in the page payload. */
const SPEC_IN_PAYLOAD: KnownGap = {
  ticket: 'IGDD-3472',
  reason: 'Not enforced by role yet: the page payload is not gated.',
}

/** For `uiOnly`: the control is hidden, but no server check backs it yet. */
const uiOnlyUntil = (ticket: string): KnownGap => ({
  ticket,
  reason: 'UI-only: no server check for this capability yet.',
})

// UI check targets. The connection table's row menu button is always there
// once the row has rendered.
const CONNECTION_TABLE = '/manageconnections'
const TABLE_ROW_READY = '[id="more_actions_{typeId}_{destId}"]'
const CHANGE_REQUEST_PAGE = '/changerequest/{dest}'
const CHANGE_REQUEST_READY = '#title-change-request'
const EDIT_PAGE = '/edit/{dest}'
// The /edit page opens on the service agreement step for everyone it renders for.
const EDIT_PAGE_CONTROL = '[data-testid="agree-button"]'

export const MATRIX: readonly MatrixRow[] = [
  {
    id: 'tenancy.reach',
    feature: 'Tenancy — Reach',
    allow: ALL_TARGET_ROLES,
    // Reach-only route: checkAccessToDestIdSlug, no capability. A foreign
    // destination is allowed only for roles that reach every jurisdiction.
    checksDestinationList: true,
    api: [
      { method: 'GET', path: '/api/destinations/{dest}', dest: 'own', refusal: 401 },
      { method: 'GET', path: '/api/destinations/{dest}', dest: 'foreign', refusal: 401 },
    ],
  },
  // Access Control: one row per tab and action (v13). The three view rows
  // share one code flag, canViewAccessControl, which matches the target: all
  // three grant the same roles.
  {
    id: 'accesscontrol.accessgroups.view',
    feature: 'Access Control — view Access Groups',
    allow: IZG_SEC_AND_OPS,
    // The page and its nav link open for any view row; they sit here.
    nav: ['/accesscontrol'],
    pages: ['/accesscontrol'],
    api: [{ method: 'GET', path: '/api/accessgroups', refusal: 403 }],
  },
  {
    id: 'accesscontrol.accessgroups.write',
    feature: 'Access Control — write Access Groups',
    allow: [IZG_SEC],
    // PUT validates the body before any read or write: {} is a 400.
    api: [{ method: 'PUT', path: '/api/accessgroups/rbac-probe-nonexistent', body: {}, refusal: 403 }],
    knownGaps: { 'IZG Operations': MOVES_TO_IZG_SECURITY },
  },
  {
    id: 'accesscontrol.denylist.view',
    feature: 'Access Control — view Deny List',
    allow: IZG_SEC_AND_OPS,
    api: [{ method: 'GET', path: '/api/denylist', refusal: 403 }],
  },
  {
    id: 'accesscontrol.denylist.write',
    feature: 'Access Control — write Deny List',
    allow: IZG_SEC_AND_OPS,
    // The handler looks the id up first and answers 404 for a sentinel.
    api: [{ method: 'DELETE', path: '/api/denylist/rbac-probe-nonexistent', refusal: 403 }],
  },
  {
    id: 'accesscontrol.adsfiletypes.view',
    feature: 'Access Control — view ADS File Types',
    allow: IZG_SEC_AND_OPS,
    api: [{ method: 'GET', path: '/api/adsfiletypes', refusal: 403 }],
  },
  {
    id: 'accesscontrol.adsfiletypes.write',
    feature: 'Access Control — write ADS File Types',
    allow: IZG_SEC_AND_OPS,
    // The handler looks the id up first and answers 404 for a sentinel.
    api: [{ method: 'DELETE', path: '/api/adsfiletypes/rbac-probe-nonexistent', refusal: 403 }],
  },
  {
    id: 'adminoperations.circuitbreaker-dbrefresh',
    feature: 'Admin Operations — Circuit Breaker Reset / DB Refresh',
    allow: [IZG_SEC, IZG_OPS, IZG_SUP, IZG_PRG],
    nav: ['/adminoperations'],
    pages: ['/adminoperations'],
    // Both handlers act on POST only; a GET is decided by the gate, then 405.
    api: [
      { method: 'GET', path: '/api/status/reset', refusal: 403 },
      { method: 'GET', path: '/api/status/refresh', refusal: 403 },
    ],
    knownGaps: {
      'IZG Support': {
        ticket: 'IGDD-3498',
        reason: 'Not yet granted: IZG Support cannot open Admin Operations.',
      },
    },
  },
  {
    id: 'adminoperations.passwordencryption-card',
    feature: 'Admin Operations — Password Encryption card',
    allow: [IZG_SEC],
    api: [
      { method: 'GET', path: '/api/encryptionStatus', refusal: 403 },
      // POST-only handlers: GET is decided by the gate, then 405.
      { method: 'GET', path: '/api/encrypt', refusal: 403 },
      { method: 'GET', path: '/api/rotatekey', refusal: 403 },
    ],
    knownGaps: { 'IZG Operations': MOVES_TO_IZG_SECURITY },
  },
  {
    id: 'apikeys.view',
    feature: 'API Key Management — view keys',
    allow: [IZG_SEC, JUR_SEC],
    requiresFlag: 'apiKeyManagement',
    nav: ['/apikeys'],
    pages: ['/apikeys'],
    api: [{ method: 'GET', path: '/api/apikeys', refusal: 403 }],
    knownGaps: API_KEYS_MOVE_TO_SECURITY,
  },
  {
    id: 'apikeys.write',
    feature: 'API Key Management — create/renew/revoke',
    allow: [IZG_SEC, JUR_SEC],
    requiresFlag: 'apiKeyManagement',
    // Revoke (PATCH) and cancel (DELETE) check the role before reading the
    // body, then answer 400 for a missing sortKey. Create validates the body
    // first, so it cannot tell a denial from bad input and is not probed.
    // Ownership across jurisdictions: e2e/tests/apiKeyRbacScoping.spec.ts.
    api: [
      { method: 'PATCH', path: '/api/apikeys', body: {}, refusal: 403 },
      { method: 'DELETE', path: '/api/apikeys', body: {}, refusal: 403 },
    ],
    knownGaps: API_KEYS_MOVE_TO_SECURITY,
  },
  {
    id: 'changerequest.healthcheck',
    feature: 'Change Request — run health check',
    allow: ALL_BUT_PROGRAM,
    // The card holds the Run button; it is never clicked.
    ui: [
      {
        page: CHANGE_REQUEST_PAGE,
        state: 'changeRequest',
        control: '#health-check',
        ready: CHANGE_REQUEST_READY,
      },
    ],
    uiOnly: uiOnlyUntil('IGDD-3545'),
  },
  {
    id: 'changerequest.viewdetails',
    feature: 'Change Request — view details',
    allow: ALL_BUT_PROGRAM,
    api: [{ method: 'GET', path: '/api/changerequest/{dest}', dest: 'own', refusal: 403 }],
  },
  {
    id: 'changerequest.jiraticket',
    feature: 'Change Request — view Jira ticket',
    allow: [IZG_SEC, IZG_OPS, IZG_SUP],
    ui: [
      {
        page: CHANGE_REQUEST_PAGE,
        state: 'changeRequest',
        control: '[data-testid="CRTicket"]',
        ready: CHANGE_REQUEST_READY,
      },
    ],
    uiOnly: uiOnlyUntil('IGDD-3545'),
    knownGaps: {
      'IZG Support': { reason: 'Not yet granted: only IZG Operations holds canViewJiraTicket today.' },
    },
  },
  {
    id: 'changerequest.reschedule-cancel',
    feature: 'Change Request — reschedule / cancel',
    allow: SECURITY_AND_OPS,
    // Only the gate's 403 counts as a refusal: the handlers answer 401
    // themselves. If the gate let one through, the handlers reject these
    // requests before any read or write (see src/pages/api/changerequest/),
    // and change request 0 does not exist.
    api: [
      {
        method: 'PUT',
        path: '/api/changerequest',
        body: {},
        denyOnly: 'reschedules a real change request',
        refusal: 403,
      },
      {
        method: 'DELETE',
        path: '/api/changerequest/0',
        denyOnly: 'cancels a real change request',
        refusal: 403,
      },
    ],
  },
  {
    id: 'changerequest.deploy',
    feature: 'Change Request — deploy change',
    allow: [IZG_SEC, IZG_OPS],
    // GET is the deploy. PATCH is decided by the method-agnostic gate, then
    // the handler throws for the unsupported method.
    api: [{ method: 'PATCH', path: '/api/changerequest/deploy/0', refusal: 403 }],
  },
  {
    id: 'console.statusreport',
    feature: 'Console — status report',
    allow: ALL_TARGET_ROLES,
    // The Home "System Resources" widget: one fixed, server-built query of
    // hub-wide host metrics, open to every signed-in user by design. No role
    // gate: its only refusal is the 401 for a missing session.
    openToAnySignedInUser: true,
    api: [{ method: 'GET', path: '/api/elasticsearch/query', refusal: 401 }],
  },
  {
    id: 'console.logsearch',
    feature: 'Admin Log Search (current /console route)',
    allow: [IZG_SEC, IZG_OPS, JUR_OPS, IZG_SUP, JUR_SUP],
    nav: ['/console'],
    pages: ['/console'],
    // Destination-scoped: own-reach roles may search only their own. The
    // gate decides the destination too, so both refusals are 403.
    api: [
      {
        method: 'POST',
        path: '/api/console/metrics',
        body: { view: 'destination', destId: '{destId}' },
        dest: 'own',
        refusal: 403,
      },
      {
        method: 'POST',
        path: '/api/console/metrics',
        body: { view: 'destination', destId: '{destId}' },
        dest: 'foreign',
        refusal: 403,
      },
    ],
  },
  {
    id: 'edit.credentials',
    feature: 'Edit Connection — change credentials',
    allow: SECURITY_AND_OPS,
    // The credential fields are on the /edit page itself, so the page is
    // what is checked (IGDD-3472).
    ui: [{ page: EDIT_PAGE, state: 'idle', control: EDIT_PAGE_CONTROL }],
    knownGaps: EDIT_PAGE_GAPS,
  },
  {
    id: 'edit.createchangerequest',
    feature: 'Edit Connection — create change request',
    allow: SECURITY_AND_OPS,
    // If the gate let it through, the handler rejects this body before any
    // read or write (see src/pages/api/changerequest/index.ts).
    api: [
      {
        method: 'POST',
        path: '/api/changerequest',
        body: {},
        denyOnly: 'raises a real change request and Jira ticket',
        refusal: 403,
      },
    ],
  },
  {
    id: 'edit.drafts',
    feature: 'Edit Connection — save/reset draft, run draft test',
    allow: SECURITY_AND_OPS,
    // Checked on a destination with a saved draft, which is what the draft
    // buttons act on (IGDD-3472).
    ui: [{ page: EDIT_PAGE, state: 'draft', control: EDIT_PAGE_CONTROL }],
    knownGaps: EDIT_PAGE_GAPS,
  },
  {
    id: 'edit.approve',
    feature: 'Edit Connection — approve change request',
    allow: [IZG_SEC, JUR_SEC],
    notAutomated:
      'The CC has no approve control: approval happens on the Jira ticket (IGDD-3472).',
  },
  {
    id: 'history.view',
    feature: 'History — all view flags',
    allow: ALL_BUT_PROGRAM,
    // Reach-only routes (IGDD-3472).
    api: [
      { method: 'GET', path: '/api/statushistory/{dest}', dest: 'own', refusal: 401 },
      { method: 'GET', path: '/api/destinationaudit/{dest}', dest: 'own', refusal: 401 },
    ],
    knownGaps: {
      'IZG Program': { ticket: 'IGDD-3472', reason: 'Not enforced by role yet.' },
    },
  },
  {
    id: 'manageconnections.runtest',
    feature: 'Manage Connections — run test',
    allow: ALL_TARGET_ROLES,
    // POST runs a live test against the IIS. GET passes the reach check and
    // then the handler refuses the method.
    api: [{ method: 'GET', path: '/api/tests/connectiontest/{dest}', dest: 'own', refusal: 401 }],
  },
  {
    id: 'manageconnections.viewchangerequest',
    feature: 'Manage Connections — view change request',
    allow: ALL_TARGET_ROLES,
    ui: [
      {
        page: CONNECTION_TABLE,
        state: 'changeRequest',
        control: '[id="changerequest_{typeId}_{destId}"]',
        ready: TABLE_ROW_READY,
      },
    ],
    uiOnly: uiOnlyUntil('IGDD-3545'),
    knownGaps: { 'IZG Program': PROGRAM_LINK_HELD_BACK },
  },
  {
    id: 'manageconnections.view',
    feature: 'Manage Connections — view connections',
    allow: ALL_TARGET_ROLES,
    nav: ['/manageconnections'],
    pages: ['/manageconnections'],
    api: [{ method: 'GET', path: '/api/destinations/{dest}', dest: 'own', refusal: 401 }],
  },
  {
    id: 'manageconnections.viewhistory',
    feature: 'Manage Connections — view history',
    allow: ALL_TARGET_ROLES,
    // An item in the row's More options menu.
    ui: [
      {
        page: CONNECTION_TABLE,
        state: 'any',
        open: TABLE_ROW_READY,
        control: '[id="history_{typeId}_{destId}"]',
        ready: TABLE_ROW_READY,
      },
    ],
    uiOnly: uiOnlyUntil('IGDD-3472'),
    knownGaps: { 'IZG Program': PROGRAM_LINK_HELD_BACK },
  },
  {
    id: 'manageconnections.edit',
    feature: 'Manage Connections — edit connection',
    allow: SECURITY_AND_OPS,
    ui: [
      {
        page: CONNECTION_TABLE,
        state: 'idle',
        control: '[id="edit_{typeId}_{destId}"]',
        ready: TABLE_ROW_READY,
      },
      // A saved draft shows a draft button in place of Edit.
      {
        page: CONNECTION_TABLE,
        state: 'draft',
        control: '[id="{typeId}_{destId}"]',
        ready: TABLE_ROW_READY,
      },
    ],
    uiOnly: uiOnlyUntil('IGDD-3472'),
  },
  {
    id: 'manageconnections.resetcircuitbreaker',
    feature: 'Manage Connections — reset circuit breaker',
    allow: ALL_TARGET_ROLES,
    // The handler decides can() for the destination before it checks the
    // method, and answers 401 itself for a refusal; a GET is decided and then
    // refused, where POST would really reset.
    api: [
      { method: 'GET', path: '/api/status/reset/{dest}', dest: 'own', refusal: 401 },
      { method: 'GET', path: '/api/status/reset/{dest}', dest: 'foreign', refusal: 401 },
    ],
    knownGaps: {
      'IZG Support': { reason: 'Not yet granted (Implementation Status page: to grant).' },
      'Jurisdiction Support': { reason: 'Not yet granted (Implementation Status page: to grant).' },
    },
  },
  {
    id: 'manageconnections.schedulemaintenance',
    feature: 'Manage Connections — schedule maintenance',
    allow: [IZG_SEC, JUR_SEC, IZG_OPS, JUR_OPS, IZG_SUP, IZG_PRG],
    // POST-only handler behind a method-agnostic gate: GET is decided, then
    // refused. The own destination passes the reach check, so the role
    // decides, with 403.
    api: [{ method: 'GET', path: '/api/maintenance/update/{dest}', dest: 'own', refusal: 403 }],
    knownGaps: {
      'IZG Support': { reason: 'Not yet granted (Implementation Status page: to grant).' },
    },
  },
  {
    id: 'onboarding.manage',
    feature: 'Onboarding Senders — add / edit',
    allow: [IZG_SEC, JUR_SEC, IZG_OPS, JUR_OPS, IZG_SUP],
    // DELETE checks required fields before anything else: {} is a 400.
    api: [{ method: 'DELETE', path: '/api/allowedusers', body: {}, refusal: 403 }],
  },
  {
    id: 'onboarding.view',
    feature: 'Onboarding Senders — view (canViewOnboarding)',
    allow: ALL_TARGET_ROLES,
    nav: ['/onboarding'],
    pages: ['/onboarding'],
    api: [{ method: 'GET', path: '/api/allowedusers/bydestination', refusal: 403 }],
  },
  {
    id: 'apidoc.view',
    feature: 'Swagger API Doc',
    allow: [IZG_SEC],
    nav: ['/api-doc'],
    pages: ['/api-doc'],
    api: [{ method: 'GET', path: '/api/swaggerjson', refusal: 403 }],
    // The page gates on the client, but the spec is built into its static
    // payload, which every signed-in user receives (authzDebt.ts, api-doc).
    pageData: [{ page: '/api-doc', prop: 'spec' }],
    knownGaps: {
      'IZG Operations': MOVES_TO_IZG_SECURITY,
      'Jurisdiction Security': SPEC_IN_PAYLOAD,
      'Jurisdiction Operations': SPEC_IN_PAYLOAD,
      'IZG Support': SPEC_IN_PAYLOAD,
      'Jurisdiction Support': SPEC_IN_PAYLOAD,
      'IZG Program': SPEC_IN_PAYLOAD,
    },
  },
  {
    id: 'test.runconnectiontest',
    feature: 'Test — run connection test',
    allow: ALL_TARGET_ROLES,
    // The /test page runs a live test on load, so only the API is probed.
    api: [{ method: 'GET', path: '/api/tests/connectiontest/{dest}', dest: 'own', refusal: 401 }],
  },
  {
    id: 'testreport.view',
    feature: 'Test Report',
    allow: ALL_TARGET_ROLES,
    pages: ['/testreport'],
  },
]
