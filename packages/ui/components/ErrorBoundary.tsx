import React from 'react'
import ErrorPage from '../pages/_error'

class ErrorBoundary extends React.Component<any, any> {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // You can use your own error logging service here
    console.error(error)
    console.info(errorInfo)
  }

  render() {
    // Check if the error is thrown
    if (this.state.hasError) {
      return <ErrorPage />
    }
    // Return children components in case of no error
    return this.props.children
  }
}

export default ErrorBoundary
