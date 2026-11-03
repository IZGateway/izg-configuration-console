import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../lib/api/api-middleware-helper'
import { loadApiDocSpec } from '../../lib/apiDocSpec'

// Serves the spec built at build time (see API_DOC_SPEC_FILE) rather than
// building it here: that needs src/pages/api/**, which the runner image does
// not ship, so it returned an empty spec in every deployed environment
// (IGDD-3550). Same responses as before: 200 with the spec, or 400 with the
// error message.
const swaggerHandler = (_req: NextApiRequest, res: NextApiResponse) => {
  try {
    res.status(200).json(loadApiDocSpec())
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error ? error.message : 'Failed to load Swagger spec',
    })
  }
}
// Bypassed withMiddleware entirely before IGDD-3472 — the compiler could not
// flag it, since a file that never calls the wrapper has nothing to type-check.
// The route-coverage test is what holds that line.
//
// The /api-doc page fetches the spec from here, so this check and the page's
// server-side gate cover both the page and its content (IGDD-3550).
export default withMiddleware({
  capability: { page: 'api-doc', capability: 'canViewApiDoc' },
})(swaggerHandler)
