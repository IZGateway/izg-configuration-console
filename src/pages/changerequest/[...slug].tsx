/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from 'react'
import Container from '../../components/Container'
import { Box } from '@mui/material'
import ErrorBoundary from '../../components/ErrorBoundary'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import DeployConnection from '../../components/DeployConnection/index'
import Close from '../../components/Close'
import { GetStaticPaths, GetStaticProps } from 'next'

const Changerequest = (props) => {
  const router = useRouter()
  const { isReady, query } = router
  const { jiraUrl } = props

  useEffect(() => {
    if (!isReady) return
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
              destId={router?.query?.slug[1] as string}
              destTypeId={router?.query?.slug[0] as string}
              jiraUrl={jiraUrl}
            />
          </div>
        </Box>
      </ErrorBoundary>
    </Container>
  )
}

export default Changerequest

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {
      jiraUrl: process.env.JIRA_BROWSER_URL.toString(),
    },
  }
}

export const getStaticPaths: GetStaticPaths<{ slug: string }> = async () => {
  return {
    paths: [], //indicates that no page needs be created at build time
    fallback: 'blocking', //indicates the type of fallback
  }
}
