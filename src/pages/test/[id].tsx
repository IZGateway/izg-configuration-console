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
  return (
    <Container title="Test Connection">
      <ErrorBoundary>
        <TestConnection
          destId={router.query?.id as string}
          destType={router.query?.destType as string}
        />
      </ErrorBoundary>
    </Container>
  )
}

export default Test
