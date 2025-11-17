/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import ConnectionsTable from '../../components/ConnectionTable'
import ErrorBoundary from '../../components/ErrorBoundary'
import Container from '../../components/Container'
import { useEffect, useState, useContext } from 'react'
import CustomSnackbar from '../../components/SnackBar'
import CombinedContext from '../../contexts/app'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import { InferGetServerSidePropsType } from 'next'
import AppHeaderBar from '../../components/AppHeader'
import DbClientFactory from '../../lib/db/DbClientFactory'
import { Destination } from '../../lib/type/Destination'
import {
  hasActiveMaintenance,
  hasFutureMaintenance,
} from '../../lib/utils/endpointmaintainance'
import { fetchEndpointStatus } from '../../lib/services/fetchEndpointStatus'
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
      const dbClient = await DbClientFactory.getDbClient()
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

const getMaintenanceValues = (destination: Destination | null) => ({
  maint_start: destination?.maintStart?.toISOString() || null,
  maint_end: destination?.maintEnd?.toISOString() || null,
})
