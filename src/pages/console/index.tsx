import Container from '../../components/Container'
import Console from '../../components/Console/index'
import { useRouter } from 'next/router'
import ErrorBoundary from '../../components/ErrorBoundary'

const ConsolePage = () => {
  const router = useRouter()
  const { isReady } = router

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
