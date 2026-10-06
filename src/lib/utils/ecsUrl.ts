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
 * Never throws: a log call must not fail because the URL it is reporting is
 * malformed (which is sometimes exactly what it is reporting). An absolute
 * string that does not parse is kept whole in `full`. Returns `undefined` for
 * a missing URL so the field is omitted rather than written empty.
 */
export const toEcsUrl = (url: string | null | undefined): EcsUrl | undefined => {
  if (url === null || url === undefined || url === '') return undefined
  const value = String(url)

  if (!ABSOLUTE_URL.test(value)) return splitQuery(value)

  try {
    const parsed = new URL(value)
    return {
      full: value,
      ...splitQuery(parsed.pathname + parsed.search),
    }
  } catch {
    return { full: value }
  }
}
