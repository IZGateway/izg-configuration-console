import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import withMiddleware from '../../../lib/api/api-middleware-helper'
import logger from '../../../../logger'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { subjectOf } from '../../../lib/security/authzsubject'
import { hasGlobalTenancy } from '../../../lib/security/policy'
import hasAccessToDestId from '../../../lib/accesshelper'
import { logAccessDenied } from '../../../lib/security/accessDeniedAudit'
import { serializeAllowedUser } from '../../../lib/type/AllowedUser'

/**
 * @swagger
 * /api/allowedusers:
 *   get:
 *     summary: Get all allowed users
 *     responses:
 *       200:
 *         description: OK. Returns array of allowed users.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   principal:
 *                     type: string
 *                     description: The principal/user identifier
 *                   environment:
 *                     type: number
 *                     description: The environment ID
 *                   destinationId:
 *                     type: string
 *                     description: The destination ID
 *                   enabled:
 *                     type: boolean
 *                     description: Whether the user is enabled
 *                   createdBy:
 *                     type: string
 *                     description: User who created this record
 *                   createdOn:
 *                     type: string
 *                     format: date-time
 *                     description: When the record was created
 *                   updatedBy:
 *                     type: string
 *                     description: User who last updated this record
 *                   updatedOn:
 *                     type: string
 *                     format: date-time
 *                     description: When the record was last updated
 *                   validatedOn:
 *                     type: string
 *                     format: date-time
 *                     description: When the user was last validated
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Create or update an allowed user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - principal
 *               - environment
 *               - destinationId
 *               - organization
 *               - enabled
 *               - createdBy
 *               - updatedBy
 *             properties:
 *               principal:
 *                 type: string
 *                 description: The principal/user identifier
 *               environment:
 *                 type: number
 *                 description: The environment ID
 *               destinationId:
 *                 type: string
 *                 description: The destination ID
 *               organization:
 *                 type: string
 *                 description: The organization name
 *               enabled:
 *                 type: boolean
 *                 description: Whether the user is enabled
 *               createdBy:
 *                 type: string
 *                 description: User who created this record
 *               updatedBy:
 *                 type: string
 *                 description: User who last updated this record
 *     responses:
 *       200:
 *         description: OK. Returns the created/updated allowed user.
 *       400:
 *         description: Bad request - missing required fields
 *       403:
 *         description: Forbidden - destinationId is outside the caller's jurisdiction
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete an allowed user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - principal
 *               - environment
 *               - destinationId
 *             properties:
 *               principal:
 *                 type: string
 *                 description: The principal/user identifier
 *               environment:
 *                 type: number
 *                 description: The environment ID
 *               destinationId:
 *                 type: string
 *                 description: The destination ID
 *     responses:
 *       200:
 *         description: OK. User successfully deleted.
 *       400:
 *         description: Bad request - missing required fields
 *       403:
 *         description: Forbidden - destinationId is outside the caller's jurisdiction
 *       500:
 *         description: Internal server error
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user) {
      logger.warn('Unauthorized GET /api/allowedusers - no session', {
        hasSession: !!session,
      })
      return res.status(401).json({ error: 'Unauthorized - Please login' })
    }
    logger.info('Received GET request to fetch allowed users')
    try {
      // Row-scoped by the caller's reach, same pair as /api/destinations
      // (IGDD-3542) and the onboarding page's own SSR load
      // (src/pages/onboarding/index.tsx). Before IGDD-3546 this called the
      // unfiltered fetchAllowedUsers(), so a direct call to this route — the
      // onboarding page itself never called it — returned every jurisdiction's
      // senders to any role holding canViewOnboarding.
      const subject = subjectOf(session)
      const hasGlobalReach = hasGlobalTenancy(subject)

      const dbClient = await DbClientFactory.getDbClient()
      const result = await dbClient.fetchAllowedUsersByDestination(
        hasGlobalReach,
        subject.jurisdictions
      )

      logger.info('Successfully fetched allowed users', {
        count: result.length,
        operation: 'fetchAllowedUsersByDestination',
        httpMethod: req.method,
        endpoint: req.url,
      })

      return res.status(200).json(result.map(serializeAllowedUser))
    } catch (error) {
      logger.error('Failed to fetch allowed users', {
        errorMessage: error?.message || 'Unknown error',
        errorType: error?.name || 'Unknown',
        stack: error?.stack || 'No stack trace',
        operation: 'fetchAllowedUsersByDestination',
        httpMethod: req.method,
        endpoint: req.url,
        errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      })

      return res.status(500).json({
        error: 'Failed to fetch allowed users',
        message: error?.message || 'Unknown error',
      })
    }
  } else if (req.method === 'POST') {
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user) {
      logger.warn('Unauthorized POST /api/allowedusers - no session', {
        hasSession: !!session,
      })
      return res.status(401).json({ error: 'Unauthorized - Please login' })
    }
    const actor = session.user.email || 'unknown'
    logger.info('Received POST request to upsert allowed user')

    try {
      // Next.js automatically parses JSON body, so req.body is already an object
      const body =
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body

      // Validate required fields
      const requiredFields = [
        'principal',
        'environment',
        'destinationId',
        'organization',
        'enabled',
        'createdBy',
        'updatedBy',
      ]
      const missingFields = requiredFields.filter(
        (field) => !body.hasOwnProperty(field)
      )

      if (missingFields.length > 0) {
        logger.warn('Missing required fields in POST request', {
          missingFields,
          operation: 'upsertAllowedUser',
          httpMethod: req.method,
          endpoint: req.url,
        })
        return res.status(400).json({
          error: 'Missing required fields',
          missingFields,
        })
      }

      // Reach check on the write, not just the capability (IGDD-3546 review).
      // `canManageSenders` says *whether* a role may mutate; it says nothing
      // about *which* destinationId. Without this, a Jurisdiction Operations
      // caller could POST any jurisdiction's destinationId, not just its own.
      //
      // `hasAccessToDestId` unions reach across every held role, same as the
      // `canManageSenders` capability check the middleware already ran unions
      // capability across every held role — so a caller holding Jurisdiction
      // Operations (scoped, grants canManageSenders) plus IZG Support (global
      // reach, grants no onboarding write) could still combine the two into a
      // global write. See authzDebt.ts for this residual, which matches the
      // existing changerequest/index.ts entry for the same shape.
      if (!hasAccessToDestId(body.destinationId, session)) {
        logAccessDenied({
          reason: 'Destination outside caller reach',
          url: req.url,
          method: req.method,
          user: session.user.email,
          roles: subjectOf(session).roles,
          destId: body.destinationId,
          page: 'onboarding',
          permission: 'onboarding.canManageSenders',
        })
        return res.status(403).json({
          error: 'Forbidden - destination outside your jurisdiction',
        })
      }

      const dbClient = await DbClientFactory.getDbClient()

      // Check if user already exists to determine change type
      const existingUser = await dbClient.fetchAllowedUser(
        body.environment,
        body.destinationId,
        body.principal
      )

      const changeType = existingUser ? 'Update' : 'Create'

      // Create AllowedUser object
      const allowedUser = {
        principal: body.principal,
        environment: body.environment,
        destinationId: body.destinationId,
        organization: body.organization,
        enabled: body.enabled,
        createdBy: body.createdBy,
        createdOn: body.createdOn ? new Date(body.createdOn) : new Date(),
        updatedBy: body.updatedBy,
        updatedOn: new Date(),
        validatedOn: body.validatedOn ? new Date(body.validatedOn) : null,
      }

      const result = await dbClient.upsertAllowedUser(allowedUser)

      // Create audit record
      logger.info('About to create allowed user audit record', {
        changeType,
        principal: result.principal,
        environment: result.environment,
        destinationId: result.destinationId,
        userName: actor,
        hasExistingUser: !!existingUser,
        operation: 'POST /api/allowedusers',
      })

      try {
        const auditCreated = await dbClient.createAllowedUserAudit(
          changeType,
          result.principal,
          result.environment,
          result.destinationId,
          actor,
          existingUser || null,
          result
        )
        logger.info('Successfully created allowed user audit record', {
          changeType,
          principal: result.principal,
          environment: result.environment,
          destinationId: result.destinationId,
          auditCreated,
          operation: 'POST /api/allowedusers',
        })
      } catch (auditError) {
        logger.error('Failed to create allowed user audit record', {
          changeType,
          principal: result.principal,
          environment: result.environment,
          destinationId: result.destinationId,
          errorMessage: auditError?.message || 'Unknown error',
          operation: 'createAllowedUserAudit',
        })
        // Continue even if audit fails - don't block the main operation
      }

      logger.info(
        `Successfully ${changeType === 'Update' ? 'updated' : 'created'} allowed user`,
        {
          principal: result.principal,
          environment: result.environment,
          destinationId: result.destinationId,
          changeType,
          operation: 'upsertAllowedUser',
          httpMethod: req.method,
          endpoint: req.url,
        }
      )

      // Serialize dates to ISO strings for JSON response
      const serializedResult = {
        principal: result.principal,
        environment: result.environment,
        destinationId: result.destinationId,
        organization: result.organization,
        enabled: result.enabled,
        createdBy: result.createdBy,
        createdOn: result.createdOn?.toISOString() || null,
        updatedBy: result.updatedBy,
        updatedOn: result.updatedOn?.toISOString() || null,
        validatedOn: result.validatedOn?.toISOString() || null,
      }

      return res.status(200).json(serializedResult)
    } catch (error) {
      logger.error('Failed to upsert allowed user', {
        errorMessage: error?.message || 'Unknown error',
        errorType: error?.name || 'Unknown',
        stack: error?.stack || 'No stack trace',
        operation: 'upsertAllowedUser',
        httpMethod: req.method,
        endpoint: req.url,
        errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      })

      return res.status(500).json({
        error: 'Failed to upsert allowed user',
        message: error?.message || 'Unknown error',
      })
    }
  } else if (req.method === 'DELETE') {
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user) {
      logger.warn('Unauthorized DELETE /api/allowedusers - no session', {
        hasSession: !!session,
      })
      return res.status(401).json({ error: 'Unauthorized - Please login' })
    }
    const actor = session.user.email || 'unknown'
    logger.info('Received DELETE request to delete allowed user')

    try {
      // Next.js automatically parses JSON body, so req.body is already an object
      const body =
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body

      // Validate required fields
      const requiredFields = ['principal', 'environment', 'destinationId']
      const missingFields = requiredFields.filter(
        (field) => !body.hasOwnProperty(field)
      )

      if (missingFields.length > 0) {
        logger.warn('Missing required fields in DELETE request', {
          missingFields,
          operation: 'deleteAllowedUser',
          httpMethod: req.method,
          endpoint: req.url,
        })
        return res.status(400).json({
          error: 'Missing required fields',
          missingFields,
        })
      }

      // Reach check on the write, not just the capability — see the matching
      // comment on the POST branch above (IGDD-3546 review).
      if (!hasAccessToDestId(body.destinationId, session)) {
        logAccessDenied({
          reason: 'Destination outside caller reach',
          url: req.url,
          method: req.method,
          user: session.user.email,
          roles: subjectOf(session).roles,
          destId: body.destinationId,
          page: 'onboarding',
          permission: 'onboarding.canManageSenders',
        })
        return res.status(403).json({
          error: 'Forbidden - destination outside your jurisdiction',
        })
      }

      const dbClient = await DbClientFactory.getDbClient()

      // Fetch existing user for audit trail before deletion
      const existingUser = await dbClient.fetchAllowedUser(
        body.environment,
        body.destinationId,
        body.principal
      )

      const deletionTimestamp = new Date()

      const result = await dbClient.deleteAllowedUser(
        body.principal,
        body.environment,
        body.destinationId
      )

      // Create audit record
      if (existingUser) {
        logger.info('About to create allowed user audit record for deletion', {
          changeType: 'Delete',
          principal: body.principal,
          environment: body.environment,
          destinationId: body.destinationId,
          userName: actor,
          operation: 'DELETE /api/allowedusers',
        })

        try {
          const auditCreated = await dbClient.createAllowedUserAudit(
            'Delete',
            body.principal,
            body.environment,
            body.destinationId,
            actor,
            {
              ...existingUser,
              updatedOn: deletionTimestamp,
              updatedBy: actor,
            },
            null
          )
          logger.info(
            'Successfully created allowed user audit record for deletion',
            {
              changeType: 'Delete',
              principal: body.principal,
              environment: body.environment,
              destinationId: body.destinationId,
              auditCreated,
              operation: 'DELETE /api/allowedusers',
            }
          )
        } catch (auditError) {
          logger.error('Failed to create allowed user audit record', {
            changeType: 'Delete',
            principal: body.principal,
            environment: body.environment,
            destinationId: body.destinationId,
            errorMessage: auditError?.message || 'Unknown error',
            operation: 'createAllowedUserAudit',
          })
          // Continue even if audit fails
        }
      }

      logger.info('Successfully deleted allowed user', {
        principal: body.principal,
        environment: body.environment,
        destinationId: body.destinationId,
        operation: 'deleteAllowedUser',
        httpMethod: req.method,
        endpoint: req.url,
      })

      return res.status(200).json({
        success: result,
        message: 'Allowed user successfully deleted',
      })
    } catch (error) {
      logger.error('Failed to delete allowed user', {
        errorMessage: error?.message || 'Unknown error',
        errorType: error?.name || 'Unknown',
        stack: error?.stack || 'No stack trace',
        operation: 'deleteAllowedUser',
        httpMethod: req.method,
        endpoint: req.url,
        errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      })

      return res.status(500).json({
        error: 'Failed to delete allowed user',
        message: error?.message || 'Unknown error',
      })
    }
  } else {
    logger.info('Received unsupported HTTP method')

    return res.status(405).json({
      error: `The HTTP ${req.method} method is not supported at this route.`,
    })
  }
}

// Before IGDD-3472 this route carried 'captureErrors' and NO authorization, so
// any authenticated session could reach it. IGDD-3472 closed that with one
// capability across every method. IGDD-3546 narrows further: GET (view) and
// POST/DELETE (mutate) now require separate capabilities, so a view-only role
// can see the list without being able to change it. GET is also row-scoped by
// jurisdiction (fetchAllowedUsersByDestination), and POST/DELETE each check
// hasAccessToDestId on body.destinationId before writing — both added after
// PR review found this route split *who* may write without ever restricting
// *which* jurisdiction's rows. See authzDebt.ts for the residual risk from
// unioning capability and reach checks independently across held roles.
export default withMiddleware(
  {
    byMethod: {
      GET: { page: 'onboarding', capability: 'canViewOnboarding' },
      POST: { page: 'onboarding', capability: 'canManageSenders' },
      DELETE: { page: 'onboarding', capability: 'canManageSenders' },
    },
  },
  'captureErrors'
)(handler)
