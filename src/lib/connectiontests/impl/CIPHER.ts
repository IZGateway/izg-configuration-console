import ConnectionTest from '../ConnectionTest'
import { ConnectionTestResult } from '../types/ConnectionTestResult'
import { TestStatus } from '../TestStatus'
import * as tls from 'tls'
import logger from '../../../../logger'

const TEST_NAME = 'Host uses a NIST approved encryption method'
export default class CIPHER extends ConnectionTest {
  private static readonly IZG_ACCEPTED_FIPS_CIPHERS: string = [
    'TLS_AES_256_GCM_SHA384',
    'TLS_AES_128_GCM_SHA256',
    'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
    'TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384',
    'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
    'TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256',
    'TLS_DHE_RSA_WITH_AES_256_GCM_SHA384',
    'TLS_DHE_DSS_WITH_AES_256_GCM_SHA384',
    'TLS_DHE_RSA_WITH_AES_128_GCM_SHA256',
    'TLS_DHE_DSS_WITH_AES_128_GCM_SHA256',
  ].join(':')

  private TLSv1_2_methodConnection = new Promise((resolve, reject) => {
    const client = tls
      .connect({
        host: this.connectionTestRequest.hostname,
        port: this.connectionTestRequest.port,
        rejectUnauthorized: false,
        ciphers: CIPHER.IZG_ACCEPTED_FIPS_CIPHERS,
        secureProtocol: 'TLSv1_2_method',
      })
      .on('error', function (err) {
        logger.debug(
          `Cipher Suites Appropriate test could NOT connect using TLSv1_2_method with ciphers: ${JSON.stringify(
            this.getCipher()
          )} and protocol: ${this.getProtocol()}`
        )
        reject(err)
        client.end()
      })
      .on('secureConnect', function () {
        logger.debug(
          `Cipher Suites Appropriate test connected successfully in using TLSv1_2_method with ciphers: ${JSON.stringify(
            this.getCipher()
          )} and protocol: ${this.getProtocol()}`
        )
        resolve('success')
        client.end()
      })
  })

  private minVersionConnection = new Promise((resolve, reject) => {
    const client = tls
      .connect({
        host: this.connectionTestRequest.hostname,
        port: this.connectionTestRequest.port,
        rejectUnauthorized: false,
        ciphers: CIPHER.IZG_ACCEPTED_FIPS_CIPHERS,
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3',
      })
      .on('error', function (err) {
        logger.debug(
          `Cipher Suites Appropriate test could NOT connect using minVersion: TLSv1.2 and maxVersion TLSv1.3 with ciphers: ${JSON.stringify(
            this.getCipher()
          )} and protocol: ${this.getProtocol()}`
        )
        reject(err)
        client.end()
      })
      .on('secureConnect', function () {
        logger.debug(
          `Cipher Suites Appropriate test connected successfully using minVersion: TLSv1.2 and maxVersion TLSv1.3 with ciphers: ${JSON.stringify(
            this.getCipher()
          )} and protocol: ${this.getProtocol()}`
        )
        resolve('success')
        client.end()
      })
  })

  run = (): Promise<ConnectionTestResult[]> => {
    const cipherConnectionTestResult: ConnectionTestResult = {
      name: TEST_NAME,
      order: this.connectionTestRequest.order,
      message: '',
      detail: null,
      status: this.status,
    }

    return Promise.allSettled([
      this.TLSv1_2_methodConnection,
      this.minVersionConnection,
    ]).then((results) => {
      const successfulConnection = results.find(
        (r) => r.status !== 'rejected'
      ) as PromiseFulfilledResult<ConnectionTestResult>
      if (successfulConnection) {
        return [
          {
            ...cipherConnectionTestResult,
            detail: `Cipher Suites Appropriate test passed`,
            status: TestStatus.PASS,
          },
        ] as ConnectionTestResult[]
      } else {
        return [
          {
            ...cipherConnectionTestResult,
            status: TestStatus.FAIL,
            message: `Cipher Suites Appropriate test failed`,
          },
        ] as ConnectionTestResult[]
      }
    })
  }
}
