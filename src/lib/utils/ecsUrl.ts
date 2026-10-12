/**
 * The ECS `url` object, limited to the subfields this app writes.
 *
 * Every log event that records a URL must use this shape, never a bare string
 * (IGDD-3541). The Elastic index maps `url` as an **object** — the healthcheck
 * logs `req` through `@elastic/ecs-winston-format`, which expands it into
 * `url.full` / `url.path` — and Elasticsearch rejects any document whose `url`
 * is a scalar:
 *
 *   object mapping for [url] tried to parse field [url] as object, but found a
 *   concrete value
 *
 * filebeat then drops the document. It still reaches stdout, so CloudWatch
 * looks correct; the loss is silent everywhere a developer would check.
 */
export interface EcsUrl {
  full?: string
  path?: string
  query?: string
}

const ABSOLUTE_URL = /^[a-z][a-z\d+.-]*:\/\//i

// The userinfo (`user:password@`) at the start of a URL, with or without a
// scheme or `//`: up to the last @ before the first `/` or `\` (which URL
// parsers also read as `/`). A `?` or `#` does not end it, so a malformed
// password containing one is still removed; the cost is that an @ in the
// query of a URL with no path removes the host too, which only ever removes
// more than the credentials, never less. A path (`/api/x`) never matches.
const USERINFO = /^((?:[a-z][a-z\d+.-]*:)?\/\/)?[^/\\]*@/i

/**
 * A URL without credentials, which are never logged. The one place that
 * decides what is redacted from a logged URL: `toEcsUrl` and the failed axios
 * request in ecsError.ts both use it.
 */
export const withoutCredentials = (url: string) => url.replace(USERINFO, '$1')

export const isPrimitive = (
  value: unknown
): value is string | number | boolean | bigint =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean' ||
  typeof value === 'bigint'

const splitQuery = (pathAndQuery: string): EcsUrl => {
  const q = pathAndQuery.indexOf('?')
  if (q === -1) return { path: pathAndQuery }
  const query = pathAndQuery.slice(q + 1)
  return query
    ? { path: pathAndQuery.slice(0, q), query }
    : { path: pathAndQuery.slice(0, q) }
}

/**
 * Convert a URL string into the ECS `url` object, mirroring how
 * `@elastic/ecs-helpers` splits `req.url`.
 *
 * - Relative (`/api/status/reset?x=1`) → `{ path, query? }`
 * - Absolute (`https://host/rest/reset`) → `{ full, path, query? }`
 *
 * Credentials (`user:password@`) are removed (`withoutCredentials`). The query
 * is kept, as `url.query`: it is what a request asked for.
 *
 * Never throws: a log call must not fail because the URL it is reporting is
 * malformed (which is sometimes exactly what it is reporting). An absolute
 * string that does not parse is kept whole in `full`. Returns `undefined` for
 * a missing URL so the field is omitted rather than written empty.
 */
export const toEcsUrl = (
  url: string | null | undefined
): EcsUrl | undefined => {
  if (url === null || url === undefined || url === '') return undefined
  const full = withoutCredentials(String(url))

  if (!ABSOLUTE_URL.test(full)) return splitQuery(full)

  try {
    const parsed = new URL(full)
    return {
      full,
      ...splitQuery(parsed.pathname + parsed.search),
    }
  } catch {
    return { full }
  }
}

/**
 * Any value logged as a `url`, in the ECS object shape: a scalar or a `URL`
 * (which would serialize to a plain string, URL#toJSON) becomes `toEcsUrl` of
 * its text. Anything else, the ECS object itself included, is returned as it
 * is.
 */
export const toEcsUrlValue = (value: unknown): unknown =>
  value instanceof URL
    ? toEcsUrl(value.href)
    : isPrimitive(value)
    ? toEcsUrl(String(value))
    : value
