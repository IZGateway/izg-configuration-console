import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Where the built API spec lives, relative to the app root (IGDD-3550).
 *
 * `prebuild` writes it (scripts/generate-swagger-doc.ts) and the Dockerfile
 * copies it into the runner image. It is built ahead of time because the spec
 * comes from the annotations in src/pages/api/**, and the runner image does not
 * ship src/ — building it per request returned an empty spec in every deployed
 * environment.
 *
 * Deliberately not under public/: anything there is served without a session
 * or a role check.
 */
export const API_DOC_SPEC_FILE = 'generated/api-doc-spec.json'

/**
 * Reads the built spec. Throws if the file is missing, rather than falling
 * back to building it from src/: a fallback would work on a developer machine
 * and nowhere else, which is how the empty spec went unnoticed. Run
 * `npm run build` (or `npm run swagger:generate-spec`) to create it.
 *
 * Server-only.
 */
export function loadApiDocSpec(): Record<string, any> {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), API_DOC_SPEC_FILE), 'utf8')
  )
}
