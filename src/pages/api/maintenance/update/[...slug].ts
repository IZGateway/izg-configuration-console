import type { NextApiRequest, NextApiResponse } from 'next'
import _ from 'lodash'
import withMiddleware, {
  destIdFromSlug,
} from '../../../../lib/api/api-middleware-helper'
import DbClientFactory from '../../../../lib/db/DbClientFactory'

/**
 * @swagger
 * /api/maintenance/update/{destTypeId}/{destId}:
 *   post:
 *     summary: Update maintenance start date, end date, reason for connection maintenance
 *     parameters:
 *       - name: destTypeId
 *         in: path
 *         required: true
 *         schema:
 *           type: number
 *         description: The ID of destination type
 *       - name: destId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the destination.
 *     responses:
 *       200:
 *         description: OK.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug } = req.query
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])
  const maintData = req.body
  if (req.method === 'POST') {
    const dbClient = await DbClientFactory.getDbClient()
    const result = await dbClient.updateDestination({
      destId: destId,
      destinationType: {
        typeId: destTypeId,
      },
      destUri: undefined,
      username: undefined,
      MSH3: undefined,
      MSH4: undefined,
      MSH5: undefined,
      RXA11: undefined,
      facilityId: undefined,
      MSH6: undefined,
      MSH11: undefined,
      MSH22: undefined,
      maintReason: maintData.message,
      maintEnd: maintData.reinstatementDateTime
        ? maintData.reinstatementDateTime
        : null,
      maintStart: maintData.startDateTime ? maintData.startDateTime : null,
      createdBy: undefined,
      createdOn: undefined,
      updatedBy: undefined,
      updatedOn: undefined,
    })
    res.json(result)
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
// The only route whose effective access NARROWS in IGDD-3472: it had no
// session, capability or tenancy check at all. Both halves are required -
// the capability, and reach over the target destination.
//
// protect-connection-pages-and-endpoints (IGDD-3545/3548): `scope` replaces
// the separately-attached `checkAccessToDestIdSlug` middleware, so capability
// and reach are now evaluated combined, role-local, via `decideRouteCapability`
// (REQUIRES_DESTINATION_SCOPE) instead of as two independently-satisfiable
// checks — closing this route's `split-decision` debt row. This also changes
// a reach-only denial's status from 401 (the old middleware) to 403 (the
// enforcer's `forbid()`); no client code branches on that distinction for
// this route.
export default withMiddleware({
  capability: { page: 'manageconnections', capability: 'canScheduleMaintainance' },
  scope: destIdFromSlug,
})(handler)
