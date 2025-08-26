import * as React from 'react'
import Container from '../../components/Container'
import { Box } from '@mui/material'
import ErrorBoundary from '../../components/ErrorBoundary'
import DeployConnection from '../../components/DeployConnection/index'
import Close from '../../components/Close'
import { InferGetServerSidePropsType } from 'next'
import _ from 'lodash'
import hasAccessToDestId from '../../lib/accesshelper'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import DbClientFactory from '../../lib/db/DbClientFactory'

const Changerequest = (
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) => {
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

export const getServerSideProps = async (context) => {
  const jiraUrl = process.env.JIRA_BROWSER_URL.toString()
  const session = await getServerSession(context.req, context.res, authOptions)
  const slug = context.params?.slug || {}
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])
  if (hasAccessToDestId(destId, session)) {
    const dbClient = await DbClientFactory.getDbClient()
    const result = await dbClient.fetchDestinationChangeRequestByDestIdAndDestType(
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
  return {}
}
