import type { NextApiRequest, NextApiResponse } from 'next'
import _ from 'lodash'
import withMiddleware from '../../api-middleware-helper'
import dbInterface from '../../../../lib/db/ConfigConsoleRepository'
// import passwordComparison from '../../../../lib/queries/fetch/passwordComparison'
/**
 * @swagger
 * /api/changerequest/checkPasswordDifference/{destTypeId}/{destId}:
 *   get:
 *     summary: Check if password is changed by changerequest.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the destination.
 *       - name: destType
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: The type id of the destination.
 *     responses:
 *       200:
 *         description: OK.
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug } = req.query
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])

  if (req.method === 'GET') {
    try {
      const result = await dbInterface.passwordComparison(destId, destTypeId)
      let isPasswordDifferent
      if (Number(result.is_password_different) === 1) {
        isPasswordDifferent = true
      } else {
        isPasswordDifferent = false
      }
      res.status(200).json({ isPasswordDifferent: isPasswordDifferent })
    } catch (error) {
      throw new Error(error.message)
    }
  } else {
    throw new Error(
      `The HTTP ${req.method} method is not supported at this route.`
    )
  }
}
export default withMiddleware('checkAccessToDestIdSlug')(handler)
