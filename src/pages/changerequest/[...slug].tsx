import * as React from 'react'
import Container from '../../components/Container'
import { Box } from '@mui/material'
import ErrorBoundary from '../../components/ErrorBoundary'
import DeployConnection from '../../components/DeployConnection/index'
import Close from '../../components/Close'
import AccessDenied from '../../components/AccessDenied'
import { InferGetServerSidePropsType } from 'next'
import _ from 'lodash'
import DbClientFactory from '../../lib/db/DbClientFactory'
import { withPageAccess } from '../../lib/security/pageAccessGate'
import { can } from '../../lib/security/policy'
import { subjectOf } from '../../lib/security/authzsubject'

const Changerequest = (
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) => {
  if (props.accessDenied) return <AccessDenied title="Change Request" />

  return (
    <Container title="Change Request">
      <ErrorBoundary>
        <Box sx={{ position: 'relative' }}>
          <div>
            <Close />
            <DeployConnection
              changeRequest={props.changeRequest}
              jiraUrl={props.jiraUrl}
            />
          </div>
        </Box>
      </ErrorBoundary>
    </Container>
  )
}

export default Changerequest

// withPageAccess gates entry on changerequest.canViewDetails (a role-level
// question, not a data path, checked with ANY_JURISDICTION). The `can()`
// check below is a SEPARATE, still necessary check: which destination's data
// this specific request may read — the page gate does not replace it. Uses
// the combined capability+reach primitive (role-local), not
// `hasAccessToDestId` (reach-only, any held role): a caller could otherwise
// supply the page-entry capability from one role and reach from a different
// one. Latent today, same split-decision class this PR closed on the API
// routes. Anusha, PR #771.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getServerSideProps = withPageAccess<
  'changerequest',
  { changeRequest: any; jiraUrl: string }
>('changerequest', async (context, requestContext) => {
  const jiraUrl = process.env.JIRA_BROWSER_URL ?? ''
  const session = requestContext.session
  const slug = (context.params?.slug as string[]) || []
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])
  if (!destId || Number.isNaN(destTypeId)) {
    return { notFound: true }
  }
  if (
    can(subjectOf(session), 'changerequest', 'canViewDetails', destId).allowed
  ) {
    const dbClient = await DbClientFactory.getDbClient()
    const result =
      await dbClient.fetchDestinationChangeRequestByDestIdAndDestType(
        destId,
        destTypeId
      )
    return {
      props: {
        changeRequest: JSON.parse(JSON.stringify(result)),
        jiraUrl: jiraUrl,
      },
    }
  }
  return { notFound: true }
})
