import ConnectionTest from '../ConnectionTest'
import { ConnectionTestResult } from '../types/ConnectionTestResult'
import { TestStatus } from '../TestStatus'
import https from 'https'
import { TestResponseMessages } from '../TestResponseMessages'
import * as fs from 'fs'
import path from 'path'
import moment from 'moment'
import { v4 as uuidv4 } from 'uuid'
import * as xml2js from 'xml2js'
import { DOMParser } from '@xmldom/xmldom'
import DbClientFactory from '../../db/DbClientFactory'
import { lookupDestinationVersion } from '../../utils/lookupDestinationVersion'

function escapeXml(unsafe : string): string {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
        }
    });
}
const randomUUID = uuidv4()
let hl7Message: string
const CONNECTION_TEST_TIMEOUT = process.env.CONNECTION_TEST_TIMEOUT ? parseInt(process.env.CONNECTION_TEST_TIMEOUT, 10) : 5000
const TEST_NAME = 'Send a Submit Single Message with an HL7 QBP for test patient'
export default class QBP extends ConnectionTest {
  skip = (msg : string): Promise<ConnectionTestResult[]> => {
    return Promise.resolve([{
      name: TEST_NAME,
      order: this.connectionTestRequest.order,
      status: TestStatus.SKIPPED,
      message: msg ? msg : 'QBP test skipped due to connectivity test failures',
      detail: null,
      type: 'qbp'
    }])
  }
  run = async (): Promise<ConnectionTestResult[]> => {
    const destination = this.connectionTestRequest.destinationData
    const hl7QueryTestResult: ConnectionTestResult = {
      name: TEST_NAME,
      order: this.connectionTestRequest.order,
      message: '',
      detail: null,
      status: this.status,
      type: 'qbp'
    }
    /* msh11 should really be set by DB, but that must wait for core/hub changes to support it */
    const normalOnboardingDestinations = [
      'casd',
      'ga',
      'hi',
      'sasj',
      'ca',
      'fl',
      'id',
      'me',
      'mi',
      'mn',
      'ms',
      'mt',
      'nc',
      'ne',
      'nh',
      'ny_vxu',
      'oh',
      'pr',
      'ri',
      'sd',
      'ut',
      'va',
      'vt',
      'wa',
      'wi',
      'wv',
      'wy',
    ]
    const dbClient = await DbClientFactory.getDbClient()
    const password = destination.password || await dbClient.fetchDestinationPassword(
      destination.destId,
      destination.destinationType.typeId
    ) || ''
    const destinationVersion = await lookupDestinationVersion(
      destination.destId,
      destination.destinationType.typeId
    ) || ''

    /* Production destinations, or non-production destinations in above list us MSH11 value of P, other non-production require T. */
    const msh11 =
      destination.destinationType.typeId == 5 ||
        normalOnboardingDestinations.includes(destination.destId)
        ? 'P'
        : 'T'

    const hl7msg = `MSH|^~\\&amp;|${destination?.MSH3}|${destination?.MSH4}|${destination?.MSH5
      }|${destination?.MSH6}|${moment().format(
        'YYYYMMDDHHmmssZZ'
      )}||QBP^Q11^QBP_Q11|${randomUUID}|${msh11}|2.5.1|||ER|AL|||||Z34^CDCPHINVS|${destination?.MSH22
      }|
QPD|Z34^Request Immunization History^CDCPHINVS|${randomUUID.replace(
        /-/g,
        ''
      )}|112258-9^^^ND^MR|JohnsonIZG^JamesIZG^AndrewIZG^^^^L|LeungIZG^SarahIZG^^^^^M|20160414|M|Main Street&amp;&amp;123^^Alexander^ND^58831^^L|^PRN^PH^^^555^5551111|Y|1
RCP|I|10^RD&amp;Records&amp;HL70126`
    const requestBody = (destinationVersion !== '2014') ?
        // 2011 is default value if not set
        `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
           <soap:Body>
             <iis:submitSingleMessage xmlns:iis="urn:cdc:iisb:2011">
               <iis:username>${escapeXml(destination?.username)}</iis:username>
               <iis:password>${escapeXml(password)}</iis:password>
               <iis:facilityID>${escapeXml(destination?.facilityId)}</iis:facilityID>
               <iis:hl7Message>${escapeXml(hl7msg)}</iis:hl7Message>
             </iis:submitSingleMessage>
           </soap:Body>
         </soap:Envelope>`
      : `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
           <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
             <wsa:Action>urn:cdc:iisb:2014:IISPortType:SubmitSingleMessageRequest</wsa:Action>
             <wsa:MessageID>${randomUUID}</wsa:MessageID>
           </soap:Header>
           <soap:Body>
             <iis:SubmitSingleMessageRequest xmlns:iis="urn:cdc:iisb:2014">
               <iis:Username>${escapeXml(destination?.username)}</iis:Username>
               <iis:Password>${escapeXml(password)}</iis:Password>
               <iis:FacilityID>${escapeXml(destination?.facilityId)}</iis:FacilityID>
               <iis:Hl7Message>${escapeXml(hl7msg)}</iis:Hl7Message>
             </iis:SubmitSingleMessageRequest>
           </soap:Body>
         </soap:Envelope>`;

    const httpsAgentOptions = {
      cert: fs.readFileSync(
        path.resolve(this.connectionTestRequest.certPath),
        `utf-8`
      ),
      key: fs.readFileSync(
        path.resolve(this.connectionTestRequest.keyPath),
        'utf-8'
      ),
      passphrase: this.connectionTestRequest.passphrase,
      rejectUnauthorized: false,
      keepAlive: true,
    }
    const isVersion2014 = destination.destVersion !== '2011'
    const options = {
      hostname: this.connectionTestRequest.url.hostname,
      port: this.connectionTestRequest.port,
      path: this.connectionTestRequest.path,
      method: 'POST',
      agent: new https.Agent(httpsAgentOptions),
      headers: {
        Host: this.connectionTestRequest.url.hostname,
        'Content-Type': isVersion2014
          ? 'application/soap+xml;charset=UTF-8;action="urn:cdc:iisb:2014:IISPortType:SubmitSingleMessageRequest"'
          : 'application/soap+xml;charset=UTF-8;action="urn:cdc:iisb:2011:submitSingleMessage"',
      },
    }

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let data = ''

        if (res.statusCode === 200) {
          res.on('data', (chunk) => {
            data = data + chunk.toString()
          })

          res.on('end', function () {
            const parser = new DOMParser()
            const xmlDoc = parser.parseFromString(data, 'text/xml')
            const elementName = isVersion2014 ? 'Hl7Message' : 'return'
            const namespace = isVersion2014
              ? 'urn:cdc:iisb:2014'
              : 'urn:cdc:iisb:2011'
            const results = xmlDoc.documentElement.getElementsByTagNameNS(
              namespace,
              elementName
            )
            const result = results.length == 0 ? null : results[0]
            let responseMessage: Element | null = null
            if (result) {
              responseMessage = result as unknown as Element
            }
            //logger.debug('Response SOAP Message: ' + data)
            if (!responseMessage?.textContent) {
              resolve([
                {
                  ...hl7QueryTestResult,
                  detail: `No message received for facility ${destination?.facilityId}`,
                  message: `${data}`,
                  status: TestStatus.FAIL,
                },
              ])
            } else {
              try {
                const isError = !responseMessage.textContent.startsWith('MSH')
                if (!isError) {
                  resolve([
                    {
                      ...hl7QueryTestResult,
                      detail: `Message received for facility ${destination?.facilityId}`,
                      status: TestStatus.PASS,
                    },
                  ])
                } else {
                  resolve([
                    {
                      ...hl7QueryTestResult,
                      detail: hl7Message,
                      message: TestResponseMessages.HL7MESSAGE_CANNOT_PARSE,
                      status: TestStatus.FAIL,
                    },
                  ])
                }
              } catch (error) {
                resolve([
                  {
                    ...hl7QueryTestResult,
                    detail: error?.message,
                    message: TestResponseMessages.HL7MESSAGE_CANNOT_PARSE,
                    status: TestStatus.FAIL,
                  },
                ])
              }
            }

            resolve([
              {
                ...hl7QueryTestResult,
                detail: null,
                message:
                  TestResponseMessages.CONNECTIVITY_ECHOBACK_NOT_EXPECTED,
                status: TestStatus.FAIL,
              },
            ])
          })
        } else {
          res.on('data', (chunk) => {
            data = data + chunk.toString()
          })
          res.on('end', function () {
            xml2js.parseString(data, (_err, result) => {
              if (!_err && result) {
                resolve([
                  {
                    ...hl7QueryTestResult,
                    detail: `${new xml2js.Builder().buildObject(result)}`,
                    message: `Server responded with HTTP status code ${res.statusCode}.`,
                    status: TestStatus.FAIL,
                  },
                ])
              } else {
                resolve([
                  {
                    ...hl7QueryTestResult,
                    detail: data || 'No data received',
                    message: `Server responded with HTTP status code ${res.statusCode}. Error parsing the XML: ${_err?.message}.`,
                    status: TestStatus.FAIL,
                  },
                ])
              }
            })
          })
        }
      })
      req.setTimeout(CONNECTION_TEST_TIMEOUT, () => {
        req.destroy()
        resolve([
          {
            ...hl7QueryTestResult,
            detail: 'ETIMEDOUT',
            message: `QBP test timed out after 5 seconds for ${options.hostname}`,
            status: TestStatus.FAIL,
          },
        ])
      })
      req.on('error', (error) => {
        resolve([
          {
            ...hl7QueryTestResult,
            detail: error?.message,
            message: TestResponseMessages.UNKNOWN_ERROR(options.hostname),
            status: TestStatus.FAIL,
          },
        ])
      })
      req.write(requestBody)
      req.end()
    })
  }
}
