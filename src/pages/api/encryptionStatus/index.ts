import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { isDatabaseEncrypted } from '../../../lib/security/crypto/DbCrypto'

let dbClient: Awaited<ReturnType<typeof DbClientFactory.getDbClient>>

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    if (!dbClient) {
      dbClient = await DbClientFactory.getDbClient(
        process.env.DB_TYPE || 'dynamo'
      )
    }
    const encrypted = await isDatabaseEncrypted(dbClient)
    res.status(200).json({ encrypted })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to check encryption status' })
  }
}

export default withMiddleware()(handler)
