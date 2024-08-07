/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from 'react'
import Container from '../../components/Container'
import { Box } from '@mui/material'
import ErrorBoundary from '../../components/ErrorBoundary'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import DeployConnection from '../../components/DeployConnection/index'
import Close from '../../components/Close'
import { InferGetServerSidePropsType } from 'next'
import destinationChangeRequest from '../../lib/queries/fetch/destinationchangerequest'
import _ from 'lodash'
import hasAccessToDestId from '../../lib/accesshelper'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'

const Changerequest = (
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) => {
  const router = useRouter()
  const { isReady, query } = router
  const [destId, setDestId] = React.useState('')
  const [destTypeId, setDestTypeId] = React.useState('')

  useEffect(() => {
    if (!isReady) return
    setDestId(query.slug[1] as string)
    setDestTypeId(query.slug[0] as string)
  }, [isReady, query])

  return !isReady ? (
    <>Loading....</>
  ) : (
    <Container title="Change Request">
      <ErrorBoundary>
        <Box sx={{ position: 'relative' }}>
          <div>
            <Close />
            <DeployConnection
              destId={destId}
              destTypeId={destTypeId}
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
    const result = await destinationChangeRequest(destId, destTypeId)
    return {
      props: {
        changerequestData: JSON.parse(JSON.stringify(result)),
        jiraUrl: jiraUrl,
      },
    }
  }
  return {}
}
