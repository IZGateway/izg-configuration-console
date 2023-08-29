import * as React from 'react'
import Container from '../../components/Container'
import ConnectionHistory from '../../components/ConnectionHistory/index'
import { useRouter } from 'next/router'
import ErrorBoundary from '../../components/ErrorBoundary'

export async function getServerSideProps() {
  return {
    props: {},
  }
}

const HistoryPage = () => {
  const router = useRouter()
  return (
    <Container title="Connection History">
      <ErrorBoundary>
        <ConnectionHistory
          destId={router.query?.id as string}
          destType={router.query?.destType as string}
          status={router.query?.status as string}
        />
      </ErrorBoundary>
    </Container>
  )
}

export default HistoryPage
