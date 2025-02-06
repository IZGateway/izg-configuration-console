import * as React from 'react'
import ConnectionsTable from '../../components/ConnectionTable'
import ErrorBoundary from '../../components/ErrorBoundary'
import Container from '../../components/Container'
import { useEffect, useState, useContext } from 'react'
import CustomSnackbar from '../../components/SnackBar'
import CombinedContext from '../../contexts/app'
import _ from 'lodash'
import axios from 'axios'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import { InferGetServerSidePropsType } from 'next'
import AppHeaderBar from '../../components/AppHeader'
import logger from '../../../logger'
import IZGHubStatusHistoryEndpoint from '../../lib/IZGHubStatusHistoryEndpoint'
import isOperationsRole from '../../lib/security/accessutils'
import { dbClient } from '../../lib/utils/dbclient'
import { IZGHubHttpsAgent } from '../../lib/utils/izghubhttpsagent'
import { Destination } from '../../lib/type/Destination'

const ALL_SETTLED_SUCCESSFUL = 'fulfilled'
const Manage = (
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) => {
  const { alert, setAlert } = useContext(CombinedContext)
  const [showSnackbar, setShowSnackbar] = useState(false)

  useEffect(() => {
    if (!_.isEmpty(alert.level)) {
      setShowSnackbar(true)
    } else {
      setShowSnackbar(false)
    }
  }, [alert])

  const handleClose = () => {
    setShowSnackbar(false)
    setAlert({
      level: '',
      jurisdiction: '',
      dest_type: '',
      message: '',
    })
  }

  return (
    <Container title="Manage Connections">
      <AppHeaderBar open />
      <ErrorBoundary>
        <ConnectionsTable data={props.data} />
        <CustomSnackbar
          open={showSnackbar}
          severity={alert.level}
          message={alert.message}
          onClose={handleClose}
        />
      </ErrorBoundary>
    </Container>
  )
}

export default Manage

export const getServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  const endpointStatuses = await fetchEndpointStatus(
    session.user.role,
    session.user.jurisdictions
  )
  const endpoints = await Promise.all(
    endpointStatuses.map(async (endpoint) => {
      const destination = await dbClient.fetchDestination(
        endpoint.destId,
        endpoint.destTypeId
      )
      const destinationChangeRequest =
        await dbClient.fetchDestinationChangeRequestByDestIdAndDestType(
          endpoint.destId,
          endpoint.destTypeId
        )
      return {
        ...endpoint,
        hasChangeRequest: destinationChangeRequest ? true : false,
        hasActiveDraft:
          destinationChangeRequest?.jiraId === null ? true : false,
        hasActiveMaintenance: destination?.hasActiveMaintenance || false,
        hasFutureMaintenance: destination?.hasFutureMaintenance || false,
        getMaintenaceValues: getMaintenaceValues(destination),
      }
    })
  )
  return { props: { data: endpoints } }
}

const fetchEndpointStatus = async (role, jurisdictions) => {
  const IZG_STATUS_ENDPOINT_URL = process.env.IZG_STATUS_ENDPOINT_URL || ''
  const configuredHubURLs = new IZGHubStatusHistoryEndpoint(
    IZG_STATUS_ENDPOINT_URL
  )
  let hubURLS = configuredHubURLs.getIZGHubURLs()

  if (!isOperationsRole(role)) {
    hubURLS = appendJurisdictionsAssignedToUser(hubURLS, jurisdictions)
  }

  const responses = Promise.allSettled(
    hubURLS.map((endpoint) =>
      axios.get(endpoint, {
        httpsAgent: IZGHubHttpsAgent,
        timeout: 30000,
      })
    )
  )

  const responseData = await responses

  const endpointStatuses = [
    ...responseData.map((response) => {
      if (response.status !== ALL_SETTLED_SUCCESSFUL) {
        logger.error(
          'Error connecting to a configured statushistory endpoint: ' +
            JSON.stringify(response)
        )
      } else {
        const data = response.value.data
        const resultCollector = []
        for (const [key, value] of Object.entries(data)) {
          const dest = {}
          dest[key] = value
          resultCollector.push(value[0])
        }
        return resultCollector
      }
    }),
  ]

  const combinedResponses = [].concat(...endpointStatuses)
  return combinedResponses
}
const getMaintenaceValues = (destination: Destination) => {
  if (_.isNull(destination)) {
    return {
      maint_start: null,
      maint_end: null,
    }
  } else {
    return {
      maint_start: destination.maintStart
        ? destination.maintStart.toISOString()
        : null,
      maint_end: destination.maintEnd
        ? destination.maintEnd.toISOString()
        : null,
    }
  }
}

function appendJurisdictionsAssignedToUser(
  hubURLS: string[],
  jurisdictions: Array<string>
) {
  return hubURLS.map(
    (izgUrl) => izgUrl + '?include=' + `${jurisdictions?.join(',')}`
  )
}
