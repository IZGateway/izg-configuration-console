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
    /**
     * The route declares a capability, but its destination-reach check lives
     * separately in the handler and both are evaluated against the whole
     * subject. That computes `(∃r: capability) ∧ (∃r: reach)` where the rule
     * requires `∃r: (capability ∧ reach)`, so a user can combine a scoped role
     * that grants the capability with an unrelated global role that grants the
     * reach. Added PR #700.
     */
    | 'split-decision'
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
  // Pages with no server-side gate: none remain.
  // ---------------------------------------------------------------------
  // edit, history, test, changerequest and testreport were gated by
  // protect-connection-pages-and-endpoints (IGDD-3545/3548). api-doc, the
  // one page previously thought structurally unfixable (it exported
  // getStaticProps, and Next forbids combining that with withPageAccess's
  // getServerSideProps), was gated by IGDD-3550 once it stopped exporting
  // getStaticProps.

  // ---------------------------------------------------------------------
  // Routes that decide authorization inside their own handler.
  // ---------------------------------------------------------------------
  // `{ inHandler }` is a comment with a type, and must be treated as one:
  // nothing verifies the string describes what the handler actually does, and
  // nothing stops a later change deleting the inline check while the
  // reassuring declaration stays behind. Hence a row each, and hence the
  // derived ratchet.
  // The seven apikeys/apikeysaudit in-handler rows (IGDD-3472) were closed by
  // declare-api-key-endpoint-permissions (IGDD-3549): all seven routes now
  // declare `capability`/`scope`/`byMethod` declaratively, including the
  // multi-environment isAdmin check, which was removed outright rather than
  // modelled (per the resolved decision that it was never a real permission
  // distinction) — not left as a row naming a flag that will never be built.
  {
    kind: 'in-handler',
    subject: 'changerequest/[...slug].ts',
    ticket: 'IGDD-3545',
    note:
      'protect-connection-pages-and-endpoints: converted from a split-decision row, DELETE method ' +
      'only - GET on this same file is fully declarative and carries no row. DELETE\'s ' +
      'destination id is only known after fetching the change request by id, so no declarative ' +
      '`scope` extractor can name it ahead of time; the handler does the combined ' +
      'capability+reach check itself via can(), the same primitive decideRouteCapability uses ' +
      'declaratively for every other route this change touches.',
  },
  {
    kind: 'in-handler',
    subject: 'tests/connectiontest/[...slug].ts',
    ticket: 'IGDD-3545',
    note:
      'protect-connection-pages-and-endpoints (PR #771 review, Anusha): two different tests for ' +
      'two different audiences share this route - testing configured/live settings ' +
      '(test.canRunConnectionTest, view-or-edit tier) vs testing unsaved draft content, present as ' +
      '`values` in the body (edit.canRunDraftConnectionTest, edit-only). Which capability applies ' +
      'depends on the request body, which no declarative `capability`/`scope` can express ahead of ' +
      'time, same shape as changerequest/[...slug].ts DELETE above.',
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
    subject: 'edit.canApproveChangeRequest',
    ticket: 'IGDD-3545',
    note:
      'PO-confirmed 2026-11-03: editing privilege for a change request IS canCreateChangeRequest ' +
      '— if a role can create, it can edit, and there is no other way to get edit access. There is ' +
      'no separate "approve" action anywhere in the UI (the Jira ticket is approved externally; ' +
      'canDeployChange, a different flag, gates deploying an already-approved request). This row ' +
      'will never gain a reader by design, not by oversight — it is intentionally redundant with ' +
      'edit.canCreateChangeRequest, which is enforced.',
    enforcement: 'Not enforced',
  },
]
