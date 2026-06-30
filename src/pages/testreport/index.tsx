import { Container } from '@mui/material'
import * as React from 'react'
import connectionTest from '../../lib/connectiontests'
import { InferGetServerSidePropsType } from 'next'
import ErrorBoundary from '../../components/ErrorBoundary'
import TestReportTable from '../../components/TestReport'
import DbClientFactory from '../../lib/db/DbClientFactory'
import { asyncRequestContext } from '../../lib/Context'
import { buildRequestContext } from '../../lib/requestContext'

const TestReport = (
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) => {
  return (
    <Container maxWidth="xl">
      <ErrorBoundary>
        <TestReportTable
          destinations={props.destinations}
          connectionTestResults={props.connectionTestResults}
          destinationDetails={props.destinationDetails}
        />
      </ErrorBoundary>
    </Container>
  )
}

export default TestReport
export async function getServerSideProps(context) {
  const { req, res } = context

  const requestContext = await buildRequestContext(req, res)
  const session = requestContext.session
  if (!session?.user) {
    return { redirect: { destination: '/api/auth/signin', permanent: false } }
  }
  const destArray = context.req.cookies['destination']
    ? JSON.parse(context.req.cookies['destination'])
    : []
  let destinations = []
  destinations = destArray.map((item) => {
    if (typeof item !== 'string' || item.length < 2) {
      return { destId: '', destTypeId: null }
    }

    const destId = item.slice(0, -1)
    const destTypeId = parseInt(item.slice(-1), 10)

    return {
      destId,
      destTypeId: isNaN(destTypeId) ? null : destTypeId,
    }
  })
  const results = await asyncRequestContext.run(requestContext, () =>
    Promise.all(
      destinations.map(async (dest) => {
        const dbClient = await DbClientFactory.getDbClient()
        const destinationToTest = await dbClient.fetchDestination(
          dest.destId,
          dest.destTypeId
        )
        const testResult = await connectionTest(destinationToTest, {
          name: session.user.name,
          email: session.user.email,
          id: session.user.id,
        })
        return {
          type: destinationToTest?.destinationType.type || 'N/A',
          destId: destinationToTest?.destId || 'N/A',
          jurisdiction: destinationToTest?.jurisdiction.description || 'N/A',
          testResults: testResult?.connectionTestResult?.testResults || [],
        }
      })
    )
  )

  const connectionTestResults = results.map((result) => {
    const getTestStatus = (testNames) => {
      const names = Array.isArray(testNames) ? testNames : [testNames]

      const test = names
        .map((name) => {
          return result.testResults.find((t) => {
            const testNameLower = t.name.toLowerCase()
            const targetNameLower = name.toLowerCase()

            if (targetNameLower === 'connectivity') {
              return (
                testNameLower.includes('connectivity') &&
                !testNameLower.includes('tcp')
              )
            }

            return testNameLower.includes(targetNameLower)
          })
        })
        .find(Boolean)

      return test ? test.status : 'N/A'
    }
    const getTestDetail = (testNames) => {
      const names = Array.isArray(testNames) ? testNames : [testNames]

      const test = names
        .map((name) => {
          return result.testResults.find((t) => {
            const testNameLower = t.name.toLowerCase()
            const targetNameLower = name.toLowerCase()

            if (targetNameLower === 'connectivity') {
              return (
                testNameLower.includes('connectivity') &&
                !testNameLower.includes('tcp')
              )
            }

            return testNameLower.includes(targetNameLower)
          })
        })
        .find(Boolean)

      return test ? test.detail : 'N/A'
    }

    return {
      destId: result.destId,
      destType: result.type,
      dns: getTestStatus('DNS'),
      dnsDetail: getTestDetail('DNS'),
      tcp: getTestStatus('TCP'),
      tcpDetail: getTestDetail('TCP'),
      tls: getTestStatus('TLS'),
      tlsDetail: getTestDetail('TLS'),
      cipher: getTestStatus(['NIST', 'cipher']),
      cipherDetail: getTestDetail(['NIST', 'cipher']),
      connectivity: getTestStatus('Connectivity'),
      connectivityDetail: getTestDetail('Connectivity'),
      wsdl: getTestStatus('WSDL'),
      wsdlDetail: getTestDetail('WSDL'),
      hl7: getTestStatus(['HL7', 'qbp']),
      hl7Detail: getTestDetail(['HL7', 'qbp']),
    }
  })
  const destinationDetails = results.map((result) => ({
    type: result.type,
    jurisdiction: result.jurisdiction,
    destId: result.destId,
  }))

  return {
    props: {
      destinations,
      connectionTestResults,
      destinationDetails,
    },
  }
}
