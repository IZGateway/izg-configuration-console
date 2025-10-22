import React from 'react'
import Container from '../../components/Container'
import OnboardSender from '../../components/Onboarding'
import ErrorBoundary from '../../components/ErrorBoundary'
import AppHeaderBar from '../../components/AppHeader'

const OnboardingPage: React.FC = () => {
  return (
    <Container title="Onboarding">
      <AppHeaderBar open />
      <ErrorBoundary>
        <OnboardSender />
      </ErrorBoundary>
    </Container>
  )
}

export default OnboardingPage
