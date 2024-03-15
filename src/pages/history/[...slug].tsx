/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from 'react'
import Container from '../../components/Container'
import ConnectionHistory from '../../components/ConnectionHistory/index'
import { useRouter } from 'next/router'
import ErrorBoundary from '../../components/ErrorBoundary'
import { useEffect } from 'react'

const HistoryPage = (props) => {
  const router = useRouter()
  const { isReady, query } = router

  useEffect(() => {
    if (!isReady) return
  }, [isReady, query])

  return !isReady ? (
    <>Loading....</>
  ) : (
    <Container title="Connection History">
      <ErrorBoundary>
        <ConnectionHistory
          destId={router?.query?.slug[1] as string}
          destTypeId={router?.query?.slug[0] as string}
          status={router.query?.status as string}
        />
      </ErrorBoundary>
    </Container>
  )
}

export default HistoryPage
