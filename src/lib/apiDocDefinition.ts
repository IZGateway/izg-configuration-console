import pack from '../../package.json'

/**
 * The OpenAPI definition shared by every place that builds the API spec: the
 * /api-doc page (at build time) and /api/swaggerjson. The route annotations
 * under src/pages/api supply the paths; this supplies the title, version and
 * description shown at the top of the documentation.
 *
 * src/next-swagger-doc.json (the swagger:generate-doc CLI config) is static
 * JSON and cannot import this, so keep its title in step by hand.
 */
export const apiDocDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'IZ Gateway Configuration Console API',
    version: pack.version,
    description: [
      'Internal API behind the IZ Gateway Configuration Console. It manages',
      'destinations and change requests, connection tests, access control,',
      'onboarding, and API keys.',
      '',
      '**Authentication:** requests use your signed-in console session. Every',
      'request carries a DPoP proof that is bound to this browser session.',
      '',
      '**"Try it out" sends real requests** to the environment this console is',
      'connected to. Only GET requests can be run from this page; the other',
      'methods are documented for reference.',
    ].join('\n'),
  },
}

export const apiDocSources = ['src/pages/api/*/*.ts', 'src/pages/api/*/*/*.ts']

/** The group Swagger UI shows untagged endpoints under (instead of "default"). */
export const API_DOC_DEFAULT_TAG = 'IZ Gateway'

const HTTP_METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
]

/**
 * Gives every operation without `tags` the IZ Gateway tag. None of the route
 * annotations declare tags, so Swagger UI would otherwise list them all under
 * a group it names "default". Mutates and returns the spec.
 */
export function tagUntaggedOperations<T extends Record<string, any>>(
  spec: T
): T {
  for (const pathItem of Object.values(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, any>)[method]
      if (operation && !operation.tags?.length) {
        operation.tags = [API_DOC_DEFAULT_TAG]
      }
    }
  }
  return spec
}

/**
 * Replaces empty media types (e.g. an `application/json:` line with nothing
 * under it, which YAML reads as null) with `{}`. Swagger UI only defaults a
 * missing media type, not a null one, and crashes rendering the response with
 * "Cannot read properties of null (reading 'get')". Mutates and returns the
 * spec.
 */
export function fillEmptyMediaTypes<T extends Record<string, any>>(spec: T): T {
  const fill = (content: Record<string, any> | undefined) => {
    for (const mediaType of Object.keys(content ?? {})) {
      if (content![mediaType] == null) content![mediaType] = {}
    }
  }
  for (const pathItem of Object.values(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = (pathItem as Record<string, any>)[method]
      if (!operation) continue
      fill(operation.requestBody?.content)
      for (const response of Object.values(operation.responses ?? {})) {
        fill((response as Record<string, any> | null)?.content)
      }
    }
  }
  return spec
}

/** How many documented operations use the given HTTP method (e.g. 'get'). */
export function countOperations(
  spec: Record<string, any>,
  method: string
): number {
  return Object.values(spec.paths ?? {}).filter(
    (pathItem) => (pathItem as Record<string, any>)[method]
  ).length
}
