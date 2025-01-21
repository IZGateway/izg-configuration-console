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
import { dbClient } from '../../lib/utils/dbclient'

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
              destId={props.destId}
              destTypeId={props.destTypeId}
              changerequestData={props.changerequestData}
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
    const result = await dbClient.fetchDestinationChangeRequestByIdAndType(
      destId,
      destTypeId
    )
    return {
      props: {
        changerequestData: JSON.parse(JSON.stringify(result)),
        jiraUrl: jiraUrl,
        destId: destId as string,
        destTypeId: destTypeId as unknown as string,
      },
    }
  }
  return {}
}
