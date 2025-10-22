import type { NextApiRequest, NextApiResponse } from 'next'
import withMiddleware from '../api-middleware-helper'
import DbClientFactory from '../../../lib/db/DbClientFactory'
import { encryptDb } from '../../../lib/security/crypto/DbCrypto'
import logger from '../../../../logger'

let dbClient: Awaited<ReturnType<typeof DbClientFactory.getDbClient>>

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    if (!dbClient) {
      dbClient = await DbClientFactory.getDbClient(
        process.env.DB_TYPE || 'dynamo'
      )
    }
    await encryptDb(dbClient)
    res
      .status(200)
      .json({ success: true, message: 'Passwords encrypted successfully' })
  } catch (err) {
    logger.error('Encryption error during password encryption', {
      error: err.message,
      stack: err.stack,
      operation: 'encrypt_passwords',
    })
    res
      .status(500)
      .json({ success: false, error: 'Failed to encrypt passwords' })
  }
}

export default withMiddleware()(handler)
