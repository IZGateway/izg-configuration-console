import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../../lib/api/api-middleware-helper'
import { buildApiDocSpec } from '../../lib/apiDocDefinition'

// Replaces next-swagger-doc's withSwagger, which has no hook for the spec
// fixes: buildApiDocSpec applies them, so this serves the same spec as the
// /api-doc page. Same responses as withSwagger: 200 with the spec, or 400
// with the error message.
const swaggerHandler = (_req: NextApiRequest, res: NextApiResponse) => {
  try {
    res.status(200).send(buildApiDocSpec())
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create Swagger spec',
    })
  }
}
// Bypassed withMiddleware entirely before IGDD-3472 — the compiler could not
// flag it, since a file that never calls the wrapper has nothing to type-check.
// The route-coverage test is what holds that line.
//
// This endpoint, not /api-doc, is what actually protects the API documentation:
// /api-doc exports getStaticProps and cannot be server-side gated, so its
// client gate only hides the interface. An empty Swagger UI is the result.
export default withMiddleware({
  capability: { page: 'api-doc', capability: 'canViewApiDoc' },
})(swaggerHandler)
