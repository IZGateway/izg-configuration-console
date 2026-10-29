/* eslint-disable @typescript-eslint/no-explicit-any */
import { GetStaticProps, InferGetStaticPropsType } from 'next'
import { createSwaggerSpec } from 'next-swagger-doc'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import 'swagger-ui-react/swagger-ui.css'
import { Alert, Box, Skeleton } from '@mui/material'
import AccessDenied from '../components/AccessDenied'
import AppHeaderBar from '../components/AppHeader'
import Close from '../components/Close'
import Container from '../components/Container'
import PageHeader from '../components/PageHeader'
import { StatCard, StatCardRow } from '../components/StatCard'
import swaggerStyles, {
  METHOD_COLOURS,
} from '../components/ApiDoc/swaggerStyles'
import useRoleAccess from '../lib/security/useRoleAccess'
import {
  apiDocDefinition,
  apiDocSources,
  countOperations,
  fillEmptyMediaTypes,
  tagUntaggedOperations,
} from '../lib/apiDocDefinition'

// swagger-ui-react ships no types, so the props used here are declared by hand.
const SwaggerUI = dynamic<{
  spec: any
  deepLinking?: boolean
  defaultModelsExpandDepth?: number
  displayRequestDuration?: boolean
  docExpansion?: 'list' | 'full' | 'none'
  supportedSubmitMethods?: string[]
}>(import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <Box aria-busy="true" aria-label="Loading API documentation">
      <Skeleton variant="rounded" height={56} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" height={48} sx={{ mb: 1 }} />
      <Skeleton variant="rounded" height={48} sx={{ mb: 1 }} />
      <Skeleton variant="rounded" height={48} />
    </Box>
  ),
})

// "Try it out" sends real requests to the environment this console is
// connected to, so only reads may be run from the page. Every other method
// stays documented, just without an Execute button.
const TRY_IT_OUT_METHODS = ['get']

const appEnvironment =
  process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase() || 'development'

/**
 * The one page in this change that is **client-gated only** — and it is not
 * counted among the pages IGDD-3472 secures.
 *
 * It cannot be server-side gated: it exports `getStaticProps`, Next forbids
 * exporting both, and converting it would move `createSwaggerSpec` to request
 * time — where it would find nothing, because the Dockerfile runner stage does
 * not copy `src/`.
 *
 * So be precise about what this achieves — and an earlier version of this
 * comment was not. **The gate hides the interface, not the content.**
 * `getStaticProps` runs at build time, where `src/` *is* present, so the full
 * spec is generated and serialized into this page's static payload. Hiding
 * `<SwaggerUI>` does not remove it: any authenticated user can read the spec
 * out of the page's `__NEXT_DATA__` or its `/_next/data/…` JSON.
 *
 * That exposure is **pre-existing and unchanged by IGDD-3472** — the previous
 * `AdminGuard` was also client-side and the spec was equally embedded — but the
 * claim that "without a spec this is an empty Swagger UI" was simply wrong, and
 * is corrected here rather than left to reassure the next reader. Raised by
 * review on PR #700.
 *
 * Not fixed here, deliberately. The fix is to stop embedding the spec and fetch
 * it from `/api/swaggerjson`, which *is* capability-gated and audited — but
 * that endpoint resolves `src/pages/api/**` at request time and the runner
 * image does not ship `src/`, so it almost certainly returns an empty spec in
 * every deployed environment. Switching to it would trade a disclosure for
 * documentation that renders blank everywhere. Both halves need fixing
 * together, in a change that can be tested against a real container.
 *
 * Tracked as an `AUTHZ_DEBT` row. Do **not** count this page among the pages
 * IGDD-3472 secures; the honest count is seven.
 */
function ApiDoc({ spec }: InferGetStaticPropsType<typeof getStaticProps>) {
  const { status } = useSession()
  const { canViewApiDoc } = useRoleAccess('api-doc')

  // Explicit loading branch, rather than falling through to the denial: render
  // on true, never hide on false. useRoleAccess returns {} until the session
  // resolves, so the gate below is closed during loading either way — this
  // just avoids flashing a denial at a user who does have access.
  if (status === 'loading') return null

  // The same denial surface as every gated page, even though this one cannot
  // audit. Returning `null` here would leave a denied user staring at a blank
  // page — no worse for security, but strictly worse than telling them why,
  // and inconsistent with the four SSR-gated pages.
  if (!canViewApiDoc) return <AccessDenied title="API Documentation" />

  // The same frame as Admin Operations: header bar, Close, then the title card.
  return (
    <Container title="API Documentation">
      <AppHeaderBar open />
      <Close />
      <PageHeader
        title="API Documentation"
        subtitle="Reference for the Configuration Console's internal API endpoints."
        actions={
          <StatCardRow>
            <StatCard
              label="GET"
              value={countOperations(spec, 'get')}
              colour={METHOD_COLOURS.get}
            />
            <StatCard
              label="POST"
              value={countOperations(spec, 'post')}
              colour={METHOD_COLOURS.post}
            />
            <StatCard
              label="DELETE"
              value={countOperations(spec, 'delete')}
              colour={METHOD_COLOURS.delete}
            />
          </StatCardRow>
        }
        sx={{ mb: 4 }}
      />
      <Alert severity="info" sx={{ mb: 2 }}>
        <strong>Try it out</strong> runs GET requests only, against{' '}
        <strong>
          {typeof window !== 'undefined' ? window.location.host : ''}
        </strong>{' '}
        ({appEnvironment}). Other methods are documented but can&apos;t be run
        from this page.
      </Alert>
      <Box sx={swaggerStyles}>
        <SwaggerUI
          spec={spec}
          deepLinking
          defaultModelsExpandDepth={-1}
          displayRequestDuration
          docExpansion="none"
          supportedSubmitMethods={TRY_IT_OUT_METHODS}
        />
      </Box>
    </Container>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  const spec: Record<string, any> = fillEmptyMediaTypes(
    tagUntaggedOperations(
      createSwaggerSpec({
        definition: apiDocDefinition,
        apis: apiDocSources,
      })
    )
  )

  return {
    props: {
      spec,
    },
  }
}

export default ApiDoc
