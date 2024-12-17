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
import { Jurisdiction } from '../../lib/type/Jurisdiction'
import IZGHubStatusHistoryEndpoint from '../../lib/IZGHubStatusHistoryEndpoint'
import isOperationsRole from '../../lib/security/accessutils'
import { dbClient } from '../../lib/utils/dbclient'
import { IZGHubHttpsAgent } from '../../lib/utils/izghubhttpsagent'

const ALL_SETTLED_SUCCESSFUL = 'fulfilled'
let destinationResult = null
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
  const endpoints = []
  for (const endpoint of endpointStatuses) {
    const data = {}
    for (const [key, value] of Object.entries(endpoint as Jurisdiction)) {
      const destArray = Promise.all(
        value.map(async (x) => {
          return {
            ...x,
            hasChangeRequest: await hasActiveChangeRequest(
              x.destId,
              x.destTypeId
            ),
            hasActiveDraft: await hasActiveDraft(x.destId, x.destTypeId),
            hasActiveMaint: await hasActiveMaintenance(x.destId, x.destTypeId),
            hasFutureMaint: await hasFutureMaintenance(x.destId, x.destTypeId),
            getMaintenaceValues: await getMaintenaceValues(
              x.destId,
              x.destTypeId
            ),
          }
        })
      )
      data[key] = await destArray
      endpoints.push(data)
    }
  }
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
          resultCollector.push(dest)
        }
        return resultCollector
      }
    }),
  ]

  const combinedResponses = [].concat(...endpointStatuses)
  return combinedResponses
}

const hasActiveChangeRequest = async (destId, destTypeId) => {
  return (await dbClient.destinationChangeRequest(destId, destTypeId))
    ? true
    : false
}

const hasActiveDraft = async (destId, destTypeId) => {
  return (await dbClient.fetchDraftRecord(destId, destTypeId)) ? true : false
}

const getDestinationResult = async (destId, destTypeId) => {
  try {
    destinationResult = await dbClient.fetchDestinationByIdAndType(
      destId,
      destTypeId
    )
  } catch (error) {
    throw new Error(error.message)
  }
}

const getMaintenaceValues = async (destId, destTypeId) => {
  await getDestinationResult(destId, destTypeId)

  if (_.isNull(destinationResult)) {
    return {
      maint_start: null,
      maint_end: null,
    }
  } else {
    return {
      maint_start: destinationResult.maint_start
        ? destinationResult.maint_start.toISOString()
        : null,
      maint_end: destinationResult.maint_end
        ? destinationResult.maint_end.toISOString()
        : null,
    }
  }
}

const hasActiveMaintenance = async (destId, destTypeId) => {
  await getDestinationResult(destId, destTypeId)
  if (
    _.isNull(destinationResult) ||
    (_.isNull(destinationResult.maint_start) &&
      _.isNull(destinationResult.maint_end))
  ) {
    return false
  } else {
    return (
      destinationResult.maint_start <= new Date() &&
      (_.isNull(destinationResult.maint_end) ||
        destinationResult.maint_end >= new Date())
    )
  }
}

const hasFutureMaintenance = async (destId, destTypeId) => {
  await getDestinationResult(destId, destTypeId)
  if (
    _.isNull(destinationResult) ||
    (_.isNull(destinationResult.maint_start) &&
      _.isNull(destinationResult.maint_end))
  ) {
    return false
  } else {
    return (
      destinationResult.maint_start >= new Date() &&
      (_.isNull(destinationResult.maint_end) ||
        destinationResult.maint_end >= new Date())
    )
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
