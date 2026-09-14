// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect'

// Enable the API Key Management release flag (IGDD-3444) for the whole test run.
// The apikeys route tests exercise the real requireApiKeyAccess/hasApiKeyPermission
// gate, so without this every route would 403 regardless of the role/ownership
// fixtures. This MUST live here rather than at the top of a test file under
// `src/pages/`: Next.js compiles every `.ts` file under `src/pages/` into a route,
// so a module-scope `process.env.FEATURE_API_KEY_MANAGEMENT_ENABLED = 'true'` in
// such a file ships in the production server bundle and turns the kill switch ON
// in the running container the moment that module is loaded.
process.env.FEATURE_API_KEY_MANAGEMENT_ENABLED = 'true'
