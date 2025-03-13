import DBClientFactory from '../db/DBClientFactory'

const client = () => {
  const DB_TYPE = process.env.DB_TYPE || 'jdbc'
  const dbClient = DBClientFactory.getDB(DB_TYPE)
  return dbClient
}

function createDBClient() {
  return client()
}

const dbClient = createDBClient()
export { dbClient }
