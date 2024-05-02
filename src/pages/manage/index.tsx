import * as React from 'react'
import ConnectionsTable from '../../components/ConnectionTable'
import ErrorBoundary from '../../components/ErrorBoundary'
import Container from '../../components/Container'
import { useEffect, useState, useContext } from 'react'
import CustomSnackbar from '../../components/SnackBar'
import CombinedContext from '../../contexts/app'
import _ from 'lodash'
import * as fs from 'fs'
import path from 'path'
import https from 'https'
import axios from 'axios'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import { InferGetServerSidePropsType } from 'next'
import destinationChangeRequest from '../../lib/queries/fetch/destinationchangerequest'
import AppHeaderBar from '../../components/AppHeader'
import fetchDraftRecord from '../../lib/queries/fetch/draftrecord'
import logger from '../../../logger'
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

type DestDetails = [
  {
    destId: string
    destType: string
    destTypeId: number
    destUri: string
    destVersion: string
    status: string
    statusAt: string
    statusBy: string
    detail?: string
    diagnostics?: string
    retryStrategy?: string
    jurisdictionName: string
    jurisdictionDesc: string
    hasChangeRequest?: boolean
    hasActiveDraft?: boolean
  }
]

type DestEndpointStatusType = {
  [key: string]: DestDetails
}

export const getServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  const endpointStatuses: DestEndpointStatusType = await fetchEndpointStatus(
    session.user.isAdmin,
    session.user.jurisdictions
  )

  const data = {}
  for (const [key, value] of Object.entries(endpointStatuses)) {
    const destArray = Promise.all(
      value.map(async (x) => {
        return {
          ...x,
          hasChangeRequest: await hasActiveChangeRequest(
            x.destId,
            x.destTypeId
          ),
          hasActiveDraft: await hasActiveDraft(x.destId, x.destTypeId),
        }
      })
    )
    data[key] = await destArray
  }
  return { props: { data } }
}

const fetchEndpointStatus = async (isAdmin, jurisdictions) => {
  const IZG_STATUS_ENDPOINT_URL = _.split(
    process.env.IZG_STATUS_ENDPOINT_URL,
    ','
  )
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

  if (!isAdmin) {
    appendJurisdictionsAssignedToUser(IZG_STATUS_ENDPOINT_URL, jurisdictions)
  }

  let endpointStatuses = {}
  const responses = Promise.allSettled(
    IZG_STATUS_ENDPOINT_URL.map((endpoint) =>
      axios.get(endpoint, {
        httpsAgent: new https.Agent(httpsAgentOptions),
        timeout: 30000,
      })
    )
  )

  const responseData = await responses
  responseData.forEach((response) => {
    if (response.status !== ALL_SETTLED_SUCCESSFUL) {
      logger.error(
        'Error connecting to a configured statushistory endpoint: ' +
          JSON.stringify(response.reason.errors)
      )
    } else {
      endpointStatuses = { ...endpointStatuses, ...response.value.data }
    }
  })
  return endpointStatuses
}

const hasActiveChangeRequest = async (destId, destTypeId) => {
  return (await destinationChangeRequest(destId, destTypeId)) ? true : false
}

const hasActiveDraft = async (destId, destTypeId) => {
  return (await fetchDraftRecord(destId, destTypeId)) ? true : false
}
function appendJurisdictionsAssignedToUser(
  IZG_STATUS_ENDPOINT_URL: string[],
  jurisdictions: any
) {
  return IZG_STATUS_ENDPOINT_URL.map(
    (izgUrl) => izgUrl + '?include=' + `${jurisdictions?.join(',')}`
  )
}
