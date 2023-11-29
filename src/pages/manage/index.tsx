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
import logger from '../../../logger'
import { authOptions } from '../api/auth/[...nextauth]'
import { InferGetServerSidePropsType } from 'next'
import destinationChangeRequest from '../../lib/queries/fetch/destinationchangerequest'

const IZG_STATUS_ENDPOINT_URL = process.env.IZG_STATUS_ENDPOINT_URL || 'unknown'
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

const Manage = (
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) => {
  const { alert } = useContext(CombinedContext)
  const [showSnackbar, setShowSnackbar] = useState(false)

  useEffect(() => {
    if (!_.isEmpty(alert.level)) {
      setShowSnackbar(true)
    } else {
      setShowSnackbar(false)
    }
  }, [alert])

  return (
    <Container title="Manage Connections">
      <ErrorBoundary>
        <ConnectionsTable data={props.data} />
        <CustomSnackbar
          open={showSnackbar}
          severity={alert.level}
          message={alert.message}
          onClose={() => setShowSnackbar(false)}
        />
      </ErrorBoundary>
    </Container>
  )
}

export default Manage

export const getServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  const endpointStatuses = await fetchEndpointStatus(
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
        }
      })
    )
    data[key] = await destArray
  }
  return { props: { data } }
}

const fetchEndpointStatus = async (isAdmin, jurisdictions) => {
  const endpoint = isAdmin
    ? IZG_STATUS_ENDPOINT_URL
    : IZG_STATUS_ENDPOINT_URL + '?include=' + `${jurisdictions?.join(',')}`
  const responseData = await axios
    .get(endpoint, {
      httpsAgent: new https.Agent(httpsAgentOptions),
      timeout: 30000,
    })
    .then((response) => {
      return response.data
    })
    .catch((error) => {
      logger.error('Something went wrong ' + endpoint, { err: error })
      throw new Error('Error fetching destinations')
    })
  return responseData
}

const hasActiveChangeRequest = async (destId, destTypeId) => {
  return (await destinationChangeRequest(destId, destTypeId)) ? true : false
}
