import { withSwagger } from 'next-swagger-doc'
import withMiddleware from '../../lib/api/api-middleware-helper'
import { apiDocDefinition, apiDocSources } from '../../lib/apiDocDefinition'

const swaggerHandler = withSwagger({
  definition: apiDocDefinition,
  apiFolder: 'pages/api',
  apis: apiDocSources,
})
// Bypassed withMiddleware entirely before IGDD-3472 — the compiler could not
// flag it, since a file that never calls the wrapper has nothing to type-check.
// The route-coverage test is what holds that line.
//
// This endpoint, not /api-doc, is what actually protects the API documentation:
// /api-doc exports getStaticProps and cannot be server-side gated, so its
// client gate only hides the interface. An empty Swagger UI is the result.
export default withMiddleware({
  capability: { page: 'api-doc', capability: 'canViewApiDoc' },
})(swaggerHandler())
