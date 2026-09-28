/**
 * Acknowledged authorization gaps (IGDD-3472).
 *
 * One typed table, replacing the four separate bookkeeping lists this change
 * would otherwise have created: an ungated-page allowlist, an unwrapped-route
 * allowlist, a numeric `inHandler` ceiling, and an unwired-permission list.
 * Three things fall out that four lists would not give:
 *
 *  - **One place to look.** Colocating route declarations at the route file is
 *    right for the declaration, but it gives up the single place to answer
 *    "what is still open?". This is that place.
 *  - **A ticket reference enforced by the type**, not by reviewer memory. A
 *    debt row cannot be written without naming who will close it.
 *  - **No magic number in the ratchet.** The coverage test asserts the count
 *    found in source equals the number of rows declared here, so an
 *    `{ inHandler }` cannot be added without a row, and closing one means
 *    deleting its row — with no ceiling to remember to decrement.
 *
 * ## What does NOT belong here
 *
 * Things that are *deliberately and permanently* fine: `_app`, `_document`,
 * `_error`, `404`, the landing page, the two next-auth routes. Those stay as
 * plain allowlists inside the tests that need them. `AUTHZ_DEBT` is for things
 * that should eventually be zero; mixing the two is exactly what makes an
 * allowlist read as a clearance.
 *
 * A declared capability that no code reads is not a guarantee, and this table
 * is what stops it being presented as one.
 */

export type AuthzDebt = {
  kind:
    | 'ungated-page'
    | 'unwrapped-route'
    | 'in-handler'
    | 'unwired-flag'
  /** A page key, a route path under `src/pages/api/`, or `page.capability`. */
  subject: string
  /**
   * The follow-up that closes this row. Required by the type rather than by
   * convention, so an acknowledged gap is always distinguishable from a
   * settled decision.
   */
  ticket: string
  note: string
  /**
   * For `unwired-flag` rows: the enforcement state, using the target role
   * matrix's own vocabulary so the code and the spike document can be diffed
   * directly rather than re-audited.
   */
  enforcement?: 'Enforced' | 'UI-only' | 'Not enforced' | 'Unconfirmed'
}

export const AUTHZ_DEBT: AuthzDebt[] = [
  // ---------------------------------------------------------------------
  // Pages with no server-side gate.
  // ---------------------------------------------------------------------
  // The first four are the *next increment of this same requirement*, not a
  // different problem: each needs one line on a capability that already exists
  // in PAGE_ENTRY. They are sequenced second because their seeds must preserve
  // today's *ungated* audience, which is a separate decision from reproducing
  // `isAdmin`.
  {
    kind: 'ungated-page',
    subject: 'edit',
    ticket: 'IGDD-3472',
    note: 'One-line withPageAccess("edit") on canChangeCredentials. Deferred: the seed must preserve the current ungated audience, not isAdmin.',
  },
  {
    kind: 'ungated-page',
    subject: 'history',
    ticket: 'IGDD-3472',
    note: 'One-line withPageAccess("history") on canViewConnectionInfo. Same deferral reason as edit.',
  },
  {
    kind: 'ungated-page',
    subject: 'test',
    ticket: 'IGDD-3472',
    note: 'One-line withPageAccess("test") on canRunConnectionTest. Same deferral reason as edit.',
  },
  {
    kind: 'ungated-page',
    subject: 'changerequest',
    ticket: 'IGDD-3472',
    note: 'One-line withPageAccess("changerequest") on canViewDetails. Same deferral reason as edit.',
  },
  {
    kind: 'ungated-page',
    subject: 'testreport',
    ticket: 'IGDD-3472',
    note: 'Has no page key in the access matrix, so unlike the four above it needs a new capability and a seed value before it can be gated.',
  },

  // ---------------------------------------------------------------------
  // Routes that decide authorization inside their own handler.
  // ---------------------------------------------------------------------
  // `{ inHandler }` is a comment with a type, and must be treated as one:
  // nothing verifies the string describes what the handler actually does, and
  // nothing stops a later change deleting the inline check while the
  // reassuring declaration stays behind. Hence a row each, and hence the
  // derived ratchet.
  {
    kind: 'in-handler',
    subject: 'apikeys/index.ts',
    ticket: 'IGDD-3472',
    note: 'Per-row jurisdiction filtering plus a multi-environment isAdmin check that is environment reach, not a capability — modelling it needs either a new apikeys.canManageMultiEnvironmentKeys flag or environment as a real scope in can().',
  },
  {
    kind: 'in-handler',
    subject: 'apikeys/domains.ts',
    ticket: 'IGDD-3472',
    note: 'Same multi-environment isAdmin check as apikeys/index.ts.',
  },
  {
    kind: 'in-handler',
    subject: 'apikeys/token.ts',
    ticket: 'IGDD-3472',
    note: 'Handler resolves the caller\'s reach per credential; lifting it needs the apikeys capability set reviewed as a whole.',
  },
  {
    kind: 'in-handler',
    subject: 'apikeys/renew/index.ts',
    ticket: 'IGDD-3472',
    note: 'As apikeys/token.ts.',
  },
  {
    kind: 'in-handler',
    subject: 'apikeys/verify-domain/index.ts',
    ticket: 'IGDD-3472',
    note: 'As apikeys/token.ts.',
  },
  {
    kind: 'in-handler',
    subject: 'apikeysaudit/index.ts',
    ticket: 'IGDD-3472',
    note:
      'Handler checks canListApiKeys, then scopes rows to owned jurisdictions. ' +
      'Landed on develop after this change was branched, declaring nothing; the ' +
      'required RouteAuthz argument is what caught it.',
  },
  {
    kind: 'in-handler',
    subject: 'apikeysaudit/[sortKey].ts',
    ticket: 'IGDD-3472',
    note: 'As apikeysaudit/index.ts.',
  },
  {
    kind: 'in-handler',
    subject: 'destinations/[...slug].ts',
    ticket: 'IGDD-3472',
    note: 'Per-destination reach check in the handler; the capability half has no agreed flag yet.',
  },
  {
    kind: 'in-handler',
    subject: 'destinationaudit/[...slug].ts',
    ticket: 'IGDD-3472',
    note: 'As destinations/[...slug].ts.',
  },
  {
    kind: 'in-handler',
    subject: 'statushistory/[...slug].ts',
    ticket: 'IGDD-3472',
    note: 'Maps to history.canViewHubStatusHistory, which is currently unwired — wiring both together is one change.',
  },
  {
    kind: 'in-handler',
    subject: 'tests/connectiontest/[...slug].ts',
    ticket: 'IGDD-3472',
    note: 'Maps to test.canRunConnectionTest, currently unwired; the /test page gate and this route should land together.',
  },
  {
    kind: 'in-handler',
    subject: 'status/reset/[...slug].ts',
    ticket: 'IGDD-3472',
    note: 'The per-destination reset. Maps to manageconnections.canResetCircuitBreaker plus a reach check; deliberately NOT the new hub-wide canResetHubCircuitBreakers.',
  },
  {
    kind: 'in-handler',
    subject: 'elasticsearch/query.ts',
    ticket: 'IGDD-3472',
    note: 'Inline isAdmin check. canViewConsole would be wrong: this route is also called from Home/SystemResourcesWidget, a surface the target matrix treats as a separate capability from the admin log search.',
  },

  // ---------------------------------------------------------------------
  // Declared capabilities that no code reads.
  // ---------------------------------------------------------------------
  // Do NOT delete these flags. They are the only written record of the
  // Confluence matrix's intended granularity, and a multi-key deletion across
  // five role files for zero behaviour change is exactly the diff a reviewer
  // rubber-stamps. Recording them here is what makes each read as a dated TODO
  // rather than a false guarantee.
  //
  // `enforcement` uses the target matrix's own vocabulary so the two can be
  // diffed rather than re-audited. `UI-only` means a component hides a control
  // on it but no server check reads it.
  {
    kind: 'unwired-flag',
    subject: 'edit.canChangeCredentials',
    ticket: 'IGDD-3472',
    note: 'Named as the /edit page entry in PAGE_ENTRY, but that entry is inert until the page is gated.',
    enforcement: 'Not enforced',
  },
  {
    kind: 'unwired-flag',
    subject: 'edit.canApproveChangeRequest',
    ticket: 'IGDD-3472',
    note: 'No reader.',
    enforcement: 'Not enforced',
  },
  {
    kind: 'unwired-flag',
    subject: 'edit.canSaveDraft',
    ticket: 'IGDD-3472',
    note: 'No reader.',
    enforcement: 'Not enforced',
  },
  {
    kind: 'unwired-flag',
    subject: 'edit.canResetDraft',
    ticket: 'IGDD-3472',
    note: 'No reader.',
    enforcement: 'Not enforced',
  },
  {
    kind: 'unwired-flag',
    subject: 'edit.canRunDraftConnectionTest',
    ticket: 'IGDD-3472',
    note: 'No reader.',
    enforcement: 'Not enforced',
  },
  {
    kind: 'unwired-flag',
    subject: 'history.canViewChangeRequest',
    ticket: 'IGDD-3472',
    note: 'The identically-named manageconnections flag IS read, on the connection table — this one, on the history block, is not. The duplicate name is why the audit event records a dotted, page-qualified permission.',
    enforcement: 'Not enforced',
  },
  {
    kind: 'unwired-flag',
    subject: 'history.canViewConnectionInfo',
    ticket: 'IGDD-3472',
    note: 'Named as the /history page entry in PAGE_ENTRY, but that entry is inert until the page is gated.',
    enforcement: 'Not enforced',
  },
  {
    kind: 'unwired-flag',
    subject: 'history.canViewConnectionInfoDetails',
    ticket: 'IGDD-3472',
    note: 'No reader.',
    enforcement: 'Not enforced',
  },
  {
    kind: 'unwired-flag',
    subject: 'history.canViewHubStatusHistory',
    ticket: 'IGDD-3472',
    note: 'The route that would enforce it, statushistory/[...slug].ts, decides in-handler — see the in-handler row above.',
    enforcement: 'Not enforced',
  },
  {
    kind: 'unwired-flag',
    subject: 'history.canViewChangeHistory',
    ticket: 'IGDD-3472',
    note: 'No reader.',
    enforcement: 'Not enforced',
  },
  {
    kind: 'unwired-flag',
    subject: 'test.canRunConnectionTest',
    ticket: 'IGDD-3472',
    note: 'The identically-named manageconnections flag IS read, on the connection table — this one, on the test block, is not.',
    enforcement: 'Not enforced',
  },
]
