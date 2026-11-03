import { InferGetServerSidePropsType } from 'next'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
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
import { countOperations } from '../components/ApiDoc/countOperations'
import { withPageAccess } from '../lib/security/pageAccessGate'

function SpecLoading() {
  return (
    <Box aria-busy="true" aria-label="Loading API documentation">
      <Skeleton variant="rounded" height={56} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" height={48} sx={{ mb: 1 }} />
      <Skeleton variant="rounded" height={48} sx={{ mb: 1 }} />
      <Skeleton variant="rounded" height={48} />
    </Box>
  )
}

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
  loading: () => <SpecLoading />,
})

// "Try it out" sends real requests to the environment this console is
// connected to, so only reads may be run from the page. Every other method
// stays documented, just without an Execute button.
const TRY_IT_OUT_METHODS = ['get']

const appEnvironment =
  process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase() || 'development'

/**
 * Gated server-side like every other page, and the spec is fetched from
 * /api/swaggerjson, which applies the same capability check (IGDD-3550).
 *
 * This page used to export `getStaticProps`, which serialized the full spec
 * into its static payload at build time. Its gate was client-side only, so it
 * hid the interface but not the content: any signed-in user could read the
 * spec out of `__NEXT_DATA__`. Nothing about the spec is in this page's props
 * now, so a denied user gets the denial and nothing else.
 */
function ApiDoc({
  accessDenied,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  // Not fetched at all on denial. The endpoint would refuse it anyway, but
  // there is no reason to make a request that can only fail.
  const { data: spec, error } = useSWR<Record<string, any>>(
    accessDenied ? null : '/api/swaggerjson'
  )

  if (accessDenied) return <AccessDenied title="API Documentation" />

  // Header bar and title card, as on Admin Operations, plus Close (back to
  // Manage Connections), which Admin Operations doesn't have.
  return (
    <Container title="API Documentation">
      <AppHeaderBar open />
      <Close />
      <PageHeader
        title="API Documentation"
        subtitle="Reference for the Configuration Console's internal API endpoints."
        // Shown once the spec arrives, since the counts come from it.
        actions={
          spec && (
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
          )
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
      {error ? (
        <Alert severity="error">
          The API documentation could not be loaded. {error.message}
        </Alert>
      ) : !spec ? (
        <SpecLoading />
      ) : (
        <Box sx={swaggerStyles}>
          <SwaggerUI
            spec={spec}
            deepLinking
            defaultModelsExpandDepth={-1}
            displayRequestDuration
            // Opens the tag groups (only IZ Gateway today) but leaves each
            // endpoint collapsed.
            docExpansion="list"
            supportedSubmitMethods={TRY_IT_OUT_METHODS}
          />
        </Box>
      )}
    </Container>
  )
}

export const getServerSideProps = withPageAccess('api-doc')

export default ApiDoc
