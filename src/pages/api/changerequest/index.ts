import type { NextApiRequest, NextApiResponse } from 'next'
import { authOptions } from '../auth/[...nextauth]'
import { getServerSession } from 'next-auth'
import hasAccessToDestId from '../../../lib/accesshelper'
import dbInterface from '../../../lib/dbInterface'
// import destinationChangeRequest from '../../../lib/queries/fetch/destinationchangerequest'
// import {
//   upsertDestinationChangeRequest,
//   deleteDestinationChangeRequest,
// } from '../../../lib/queries/mutate/destinationchangerequest'
// import upsertDraftRecord from '../../../lib/queries/mutate/draftrecord'
// import fetchDraftRecord from '../../../lib/queries/fetch/draftrecord'

import _ from 'lodash'
import createChangeRequestTicket from '../../../lib/createchangerequestticket'

import withMiddleware from '../api-middleware-helper'
import logger from '../../../../logger'
/**
 * @swagger
 * /api/changerequest:
 *   post:
 *     summary: Schedule change in destination information by ID.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the destination.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             username: string
 *             facility_id: string
 *             MSH3: string
 *             MSH4: string
 *             MSH5: string
 *             MSH6: string
 *             MSH22: string
 *             RXA11: string
 *     responses:
 *       200:
 *         description: destination successfully scheduled to change upon approval.
 *         content:
 *           application/json:
 *       400:
 *         description: Bad request.
 */
const JIRA_API_URL = process.env.JIRA_API_URL || undefined
const JIRA_API_ISSUE_TYPE = process.env.JIRA_API_ISSUE_TYPE || undefined
const JIRA_API_PROJECT_ID = process.env.JIRA_API_PROJECT_ID || undefined
const JIRA_API_AUTH_BASE64 = process.env.JIRA_API_AUTH_BASE64 || undefined

const isJiraConfigured = () => {
  if (
    JIRA_API_AUTH_BASE64 &&
    JIRA_API_ISSUE_TYPE &&
    JIRA_API_PROJECT_ID &&
    JIRA_API_URL
  )
    return true
  return false
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const requestBody = JSON.parse(req.body)
  const session = await getServerSession(req, res, authOptions)

  if (!isJiraConfigured) {
    throw new Error(
      'Jira connection is not configured correctly. Ensure the necessary variables have been configured for the environment.'
    )
  }
  if (hasAccessToDestId(requestBody.dest_id, session)) {
    const { dest_id, dest_type_id, draft } = requestBody
    if (req.method === 'POST') {
      if (draft === true) {
        await upsertDraft(requestBody)
        logger.info('Draft was saved successfully for ' + requestBody.dest_uri)
        res.status(200)
        res.json('Draft was saved.')
      } else {
        try {
          if (await hasActiveDraft(dest_id, dest_type_id)) {
            const draftRecord = await hasActiveDraft(dest_id, dest_type_id)
            const modifiedDraftRecord = _.omit(draftRecord, 'destinations')
            let changeRequestTicketResponse = null
            try {
              changeRequestTicketResponse = await createChangeRequestTicket({
                ...requestBody,
                changeRequestId: draftRecord.id,
              })

              await updateChangeRequestRecord({
                ...modifiedDraftRecord,
                jira_id: changeRequestTicketResponse.key,
              })
              res
                .status(200)
                .json('Change request ticket created successfully.')
            } catch (error) {
              throw new Error(
                `Error creating change request ticket for ${requestBody.dest_id} on environment ${requestBody.dest_type_id} : ${error}`
              )
            }
          } else if (await hasActiveChangeRequest(dest_id, dest_type_id)) {
            res.status(409)
            res.json(
              'Conflict creating the requested resource because it already exists.'
            )
          } else {
            await createChangeRequest(requestBody)
            logger.info(
              'change request created successfully for ' + requestBody.dest_uri
            )
            res.status(200)
            res.json('The change request was created.')
          }
        } catch (error) {
          throw new Error(`${error}`)
        }
      }
    } else {
      throw new Error(
        `The HTTP ${req.method} method is not supported at this route.`
      )
    }
  } else {
    res.status(401)
  }
}

const hasActiveChangeRequest = async (
  dest_id: string,
  dest_type_id: number
) => {
  const changeRequest = await destinationChangeRequest(dest_id, dest_type_id)
  return !_.isEmpty(changeRequest)
}

const hasActiveDraft = async (dest_id: string, dest_type_id: number) => {
  const changeRequest = await dbInterface.fetchDraftRecord(dest_id, dest_type_id)
  return changeRequest
}

const createChangeRequest = async (changeRequestDetails: any) => {
  const changeRequestRecord = await insertChangeRequestRecord(
    changeRequestDetails
  )
  if (!_.isEmpty(changeRequestRecord)) {
    let changeRequestTicketResponse = null
    try {
      changeRequestTicketResponse = await createChangeRequestTicket({
        ...changeRequestDetails,
        changeRequestId: changeRequestRecord.id,
      })
      await updateChangeRequestRecord({
        ...changeRequestRecord,
        jira_id: changeRequestTicketResponse.key,
      })
    } catch (error) {
      throw new Error(
        `Error creating change request ticket for ${changeRequestDetails.dest_id} on environment ${changeRequestDetails.dest_type_id} : ${error}`
      )
    } finally {
      if (_.isNull(changeRequestTicketResponse)) {
        deleteChangeRequestRecord(changeRequestRecord.id)
      }
    }
  }
}

const upsertDraft = async (changeRequestDetails: any) => {
  const activeDraftRecord = await hasActiveDraft(
    changeRequestDetails.dest_id,
    changeRequestDetails.dest_type_id
  )
  if (_.isEmpty(activeDraftRecord)) {
    await dbInterface.upsertDraftRecord({
      ..._.omit(changeRequestDetails.requested, [
        'newPassword',
        'confirmPassword',
      ]),
      password: changeRequestDetails.requested.newPassword,
      jira_id: null,
      dest_id: changeRequestDetails.dest_id,
      dest_uri: changeRequestDetails.dest_uri,
      dest_type: changeRequestDetails.dest_type_id,
      scheduledAt: changeRequestDetails.scheduledAt,
      requestedBy: changeRequestDetails.requestedBy,
    })
  } else {
    await dbInterface.upsertDraftRecord({
      ..._.omit(changeRequestDetails.requested, [
        'newPassword',
        'confirmPassword',
      ]),
      password: changeRequestDetails.requested.newPassword,
      jira_id: null,
      dest_id: changeRequestDetails.dest_id,
      dest_uri: changeRequestDetails.dest_uri,
      dest_type: changeRequestDetails.dest_type_id,
      scheduledAt: changeRequestDetails.scheduledAt,
      requestedBy: changeRequestDetails.requestedBy,
      id: activeDraftRecord.id,
    })
  }
}

const insertChangeRequestRecord = async (changeRequestDetails: any) => {
  const createdChangeRequestDBRecord = await dbInterface.upsertDestinationChangeRequest({
    ..._.omit(changeRequestDetails.requested, [
      'newPassword',
      'confirmPassword',
    ]),
    password: changeRequestDetails.requested.newPassword,
    jira_id: null,
    dest_id: changeRequestDetails.dest_id,
    dest_uri: changeRequestDetails.dest_uri,
    dest_type: changeRequestDetails.dest_type_id,
    scheduledAt: changeRequestDetails.scheduledAt,
    requestedBy: changeRequestDetails.requestedBy,
  })
  return createdChangeRequestDBRecord
}

const updateChangeRequestRecord = async (changeRequestRecord: any) => {
  await dbInterface.upsertDestinationChangeRequest(changeRequestRecord)
}

const deleteChangeRequestRecord = async (id: any) => {
  await dbInterface.deleteDestinationChangeRequest(id)
}
export default withMiddleware('logRequest')(handler)
