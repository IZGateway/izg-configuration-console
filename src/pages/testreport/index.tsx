import { Container } from '@mui/material'
import { getServerSession } from 'next-auth'
import * as React from 'react'
import destination from '../../lib/queries/fetch/destination'
import { authOptions } from '../api/auth/[...nextauth]'
import connectionTest from '../../lib/connectiontests'
import cookie from 'cookie'
import { InferGetServerSidePropsType } from 'next'
import ErrorBoundary from '../../components/ErrorBoundary'
import TestReportTable from '../../components/TestReport'

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

  const session = await getServerSession(req, res, authOptions)
  const cookies = cookie.parse(req.headers.cookie || '')
  const destArray = cookies.destination ? JSON.parse(cookies.destination) : []
  let destinations = []
  destinations = destArray.map((item) => {
    const match = item.match(/([a-zA-Z]+)(\d+)/)
    return {
      destId: match ? match[1] : '',
      destTypeId: match ? parseInt(match[2], 10) : null,
    }
  })
  const results = await Promise.all(
    destinations.map(async (dest) => {
      const destinationToTest = await destination(dest.destId, dest.destTypeId)
      const testResult = await connectionTest(
        destinationToTest,
        session.user.email
      )
      return {
        type: destinationToTest.destination_type.type || 'N/A',
        destId: destinationToTest.dest_id || 'N/A',
        jurisdiction: destinationToTest.jurisdiction.description || 'N/A',
        testResults: testResult.connectionTestResult?.testResults || [],
      }
    })
  )

  const connectionTestResults = results.map((result) => {
    const getTestStatus = (testName) => {
      const test = result.testResults.find((t) => t.name === testName)
      return test ? test.status : 'N/A'
    }
    const getTestDetail = (testName) => {
      const test = result.testResults.find((t) => t.name === testName)
      return test ? test.detail : 'N/A'
    }

    return {
      destId: result.destId,
      destType: result.type,
      dns: getTestStatus('DNS Lookup Test'),
      dnsDetail: getTestDetail('DNS Lookup Test'),
      tcp: getTestStatus('TCP Connectivity Test'),
      tcpDetail: getTestDetail('TCP Connectivity Test'),
      tls: getTestStatus('TLS Version Test'),
      tlsDetail: getTestDetail('TLS Version Test'),
      cipher: getTestStatus('Cipher Suites Appropriate'),
      cipherDetail: getTestDetail('Cipher Suites Appropriate'),
      connectivity: getTestStatus('Connectivity Test'),
      connectivityDetail: getTestDetail('Connectivity Test'),
      wsdl: getTestStatus('WSDL Test'),
      wsdlDetail: getTestDetail('WSDL Test'),
      hl7: getTestStatus('HL7 Query Test'),
      hl7Detail: getTestDetail('HL7 Query Test'),
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
