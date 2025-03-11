import Testable from './Testable'
import { ConnectionTestRequest } from './types/ConnectionTestRequest'
import DNS from './impl/DNS'
import TCP from './impl/TCP'
import TLS from './impl/TLS'
import CIPHER from './impl/CIPHER'
import WSDL from './impl/WSDL'
import CONNECTIVITY from './impl/CONNECTIVITY'
import QBP from './impl/QBP'

export default class ConnectionTestFactory {
  static getConnectionTest(
    testName: string,
    connectionTestRequest: ConnectionTestRequest,
    jurisdictionUrl: string,
    hostname: string
  ): Testable {
    if (testName === 'dns') {
      return new DNS(connectionTestRequest, jurisdictionUrl)
    }
    if (testName === 'tcp') {
      return new TCP(connectionTestRequest, jurisdictionUrl)
    }
    if (testName === 'tls') {
      return new TLS(connectionTestRequest, jurisdictionUrl)
    }
    if (testName === 'cipher') {
      return new CIPHER(connectionTestRequest)
    }
    if (testName === 'wsdl') {
      return new WSDL(connectionTestRequest, hostname)
    }
    if (testName === 'connectivity') {
      return new CONNECTIVITY(connectionTestRequest)
    }
    if (testName === 'qbp') {
      return new QBP(connectionTestRequest)
    }
    return null as unknown as Testable
  }
}
