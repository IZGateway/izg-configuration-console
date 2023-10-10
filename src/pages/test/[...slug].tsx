import * as React from 'react'
import TestConnection from '../../components/TestConnection'
import ErrorBoundary from '../../components/ErrorBoundary'
import Container from '../../components/Container'
import { useRouter } from 'next/router'

export async function getServerSideProps() {
  return {
    props: {},
  }
}

const Test = () => {
  const router = useRouter()
  const { isReady, query } = router

  React.useEffect(() => {
    if (!isReady) return
  }, [isReady, query])
  return (
    <Container title="Test Connection">
      <ErrorBoundary>
        <TestConnection
          destId={router?.query?.slug[1]}
          destTypeId={router?.query?.slug[0]}
        />
      </ErrorBoundary>
    </Container>
  )
}

export default Test
