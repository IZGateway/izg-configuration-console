/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from 'react'
import Container from '../../components/Container'
import Console from '../../components/Console/index'
import { useRouter } from 'next/router'
import ErrorBoundary from '../../components/ErrorBoundary'
import { useEffect } from 'react'

const ConsolePage = (props) => {
  const router = useRouter()
  const { isReady, query } = router

  useEffect(() => {
    if (!isReady) return
  }, [isReady, query])

  return !isReady ? (
    <>Loading....</>
  ) : (
    <Container title="Console">
      <ErrorBoundary>
        <Console />
      </ErrorBoundary>
    </Container>
  )
}

export default ConsolePage
