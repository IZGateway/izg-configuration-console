import ConnectionTest from '../ConnectionTest'
import { ConnectionTestResult } from '../types/ConnectionTestResult'
import { TestStatus } from '../TestStatus'
import * as tls from 'tls'

const TEST_NAME = 'Cipher Suites Appropriate'
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

  run = (): Promise<ConnectionTestResult[]> => {
    const cipherConnectionTestResult: ConnectionTestResult = {
      name: TEST_NAME,
      order: this.connectionTestRequest.order,
      message: '',
      detail: null,
      status: this.status,
    }

    return new Promise((resolve) => {
      tls
        .connect(
          {
            host: this.connectionTestRequest.hostname,
            port: this.connectionTestRequest.port,
            //path: this.connectionTestRequest.path,
            rejectUnauthorized: false,
            ciphers: CIPHER.IZG_ACCEPTED_FIPS_CIPHERS,
            secureProtocol: 'TLSv1_2_method',
            // // or for node v10.16.0+:
            // minVersion: 'TLSv1.2',
            // maxVersion: 'TLSv1.2',
          },
          function () {
            resolve([
              {
                ...cipherConnectionTestResult,
                detail: `Cipher Suites Appropriate test passed`,
                status: TestStatus.PASS,
              },
            ])
          }
        )
        .on('error', function (err) {
          resolve([
            {
              ...cipherConnectionTestResult,
              detail: `${err.message}`,
              message: `Cipher Suites Appropriate test failed with error: ${err.message}`,
              status: TestStatus.FAIL,
            },
          ])
        })
        .on('secureConnect', function () {
          console.log(
            `DEBUG ---> Cipher Suites Appropriate test connected successfully using ciphers: ${JSON.stringify(
              this.getCipher()
            )}`
          )
        })
        .on('close', function () {
          console.log(
            `DEBUG ---> Cipher Suites Appropriate test connection closed`
          )
        })
        .on('data', function (data) {
          console.log(
            `DEBUG ---> Cipher Suites Appropriate test received data: ${data}`
          )
        })
        .on('message', function (msg) {
          console.log(
            `DEBUG ---> Cipher Suites Appropriate test received message: ${msg}`
          )
        })
    })
  }
}
