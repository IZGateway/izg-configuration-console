// `npm run swagger:generate-doc`: writes the API spec to swaggerAPI.json.
//
// Builds it with buildApiDocSpec, the same function the /api-doc page and
// /api/swaggerjson use, so the file has the same title, version (read from
// package.json) and spec fixes. It replaced next-swagger-doc-cli, whose static
// JSON config needed its title and version kept in step by hand.
import { writeFileSync } from 'node:fs'
import { buildApiDocSpec } from '../src/lib/apiDocDefinition'

const output = 'swaggerAPI.json'
writeFileSync(output, JSON.stringify(buildApiDocSpec(), null, 2) + '\n')
console.log(`Wrote ${output}`)
