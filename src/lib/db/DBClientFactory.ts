import Dynamo from './dynamo'
import JDBC from './jdbc'

export default class DBClientFactory {
  static getDB(dbType: string) {
    const type = dbType.toLowerCase()
    if (type === 'jdbc') {
      return new JDBC()
    }
    if (type === 'dynamo') {
      return new Dynamo()
    }
    return null
  }
}
