// `npm run swagger:generate-doc [output]`: writes the API spec to a JSON file,
// swaggerAPI.json by default.
//
// Builds it with buildApiDocSpec, so the file has the same title, version (read
// from package.json) and spec fixes wherever it is written. It replaced
// next-swagger-doc-cli, whose static JSON config needed its title and version
// kept in step by hand.
//
// `prebuild` also runs it with API_DOC_SPEC_FILE as the output (IGDD-3550).
// That copy is what /api/swaggerjson serves: the spec is built from
// src/pages/api/**, which the runner image does not ship, so it has to be
// built here, where src/ exists, and shipped as a file.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { buildApiDocSpec } from '../src/lib/apiDocDefinition'

const output = process.argv[2] || 'swaggerAPI.json'
const spec = buildApiDocSpec()

// createSwaggerSpec returns an empty spec, not an error, when its globs match
// nothing. Fail here rather than ship documentation that renders blank.
const pathCount = Object.keys(spec.paths ?? {}).length
if (pathCount === 0) {
  console.error(
    `No API paths found; refusing to write an empty spec to ${output}`
  )
  process.exit(1)
}

mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(spec, null, 2) + '\n')
console.log(`Wrote ${output} (${pathCount} paths)`)
