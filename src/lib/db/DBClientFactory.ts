import ConfigConsoleRepository from './ConfigConsoleRepository'
import Dynamo from './dynamo'
import JDBC from './jdbc'

export default class DBClientFactory {
  static getDB(dbType: string): ConfigConsoleRepository {
    const type = dbType.toLowerCase()
    if (type === 'jdbc') {
      return new JDBC()
    }
    if (type === 'dynamo') {
      return new Dynamo()
    }
    return null as unknown as ConfigConsoleRepository
  }
}
