import * as React from 'react'
import ConnectionsTable from '../../components/ConnectionTable'
import ErrorBoundary from '../../components/ErrorBoundary'
import Container from '../../components/Container'
import { useEffect, useState, useContext } from 'react'
import CustomSnackbar from '../../components/SnackBar'
import CombinedContext from '../../contexts/app'
import * as fs from 'fs'
import path from 'path'
import https from 'https'
import axios from 'axios'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import { InferGetServerSidePropsType } from 'next'
import AppHeaderBar from '../../components/AppHeader'
import IZGHubStatusHistoryEndpoint from '../../lib/IZGHubStatusHistoryEndpoint'
import isOperationsRole from '../../lib/security/accessutils'
import { dbClient } from '../../lib/utils/dbclient'
import { Destination } from '../../lib/type/Destination'
import {
  hasActiveMaintenance,
  hasFutureMaintenance,
} from '../../lib/utils/endpointmaintainance'

// Cache certificate and key files to avoid repeated reads
const IZG_ENDPOINT_CRT_PATH = process.env.IZG_ENDPOINT_CRT_PATH || ''
const IZG_ENDPOINT_KEY_PATH = process.env.IZG_ENDPOINT_KEY_PATH || ''
const IZG_ENDPOINT_PASSCODE = process.env.IZG_ENDPOINT_PASSCODE || ''
const httpsAgentOptions = {
  cert: fs.readFileSync(path.resolve(IZG_ENDPOINT_CRT_PATH), 'utf-8'),
  key: fs.readFileSync(path.resolve(IZG_ENDPOINT_KEY_PATH), 'utf-8'),
  passphrase: IZG_ENDPOINT_PASSCODE,
  rejectUnauthorized: false,
  keepAlive: true,
}
const httpsAgent = new https.Agent(httpsAgentOptions)

const ALL_SETTLED_SUCCESSFUL = 'fulfilled'

const Manage = (
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) => {
  const { alert, setAlert } = useContext(CombinedContext)
  const [showSnackbar, setShowSnackbar] = useState(false)

  useEffect(() => {
    setShowSnackbar(!!alert.level)
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
        hasChangeRequest: !!destinationChangeRequest,
        hasActiveDraft: destinationChangeRequest?.jiraId === null,
        hasActiveMaintenance: hasActiveMaintenance(
          destination?.maintStart,
          destination?.maintEnd
        ),
        hasFutureMaintenance: hasFutureMaintenance(
          destination?.maintStart,
          destination?.maintEnd
        ),
        maintenanceValues: getMaintenanceValues(destination),
      }
    })
  )

  return { props: { data: endpoints } }
}

const fetchEndpointStatus = async (
  role: string,
  jurisdictions: string[]
): Promise<any[]> => {
  const IZG_STATUS_ENDPOINT_URL = process.env.IZG_STATUS_ENDPOINT_URL || ''
  const configuredHubURLs = new IZGHubStatusHistoryEndpoint(
    IZG_STATUS_ENDPOINT_URL
  )
  let hubURLs = configuredHubURLs.getIZGHubURLs()

  if (!isOperationsRole(role)) {
    hubURLs = appendJurisdictionsAssignedToUser(hubURLs, jurisdictions)
  }

  const responses = await Promise.allSettled(
    hubURLs.map((endpoint) =>
      axios.get(endpoint, {
        httpsAgent,
        timeout: 30000,
      })
    )
  )

  return responses
    .filter((response) => response.status === ALL_SETTLED_SUCCESSFUL)
    .map((response: any) => response.value.data)
    .flatMap((data) => Object.values(data).map((value: any) => value[0]))
}

const getMaintenanceValues = (destination: Destination | null) => ({
  maint_start: destination?.maintStart?.toISOString() || null,
  maint_end: destination?.maintEnd?.toISOString() || null,
})

const appendJurisdictionsAssignedToUser = (
  hubURLs: string[],
  jurisdictions: string[]
): string[] => {
  return hubURLs.map((izgUrl) => `${izgUrl}?include=${jurisdictions.join(',')}`)
}
