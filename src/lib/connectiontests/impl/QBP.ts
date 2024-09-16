/* eslint-disable no-useless-escape */
/* eslint-disable no-prototype-builtins */
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
import { prismacontext } from '../../prismacontext'
import logger from '../../../../logger'
import _ from 'lodash'
import { DOMParser } from '@xmldom/xmldom'

const TEST_NAME = 'HL7 Query Test'
const randomUUID = uuidv4()
const date = new Date()
let hl7Message: string
let requestBody: string
let responseMessage: string

export default class QBP extends ConnectionTest {
  run = async (): Promise<ConnectionTestResult[]> => {
    const destination = this.connectionTestRequest.destinationData
    const password = await lookupDestinationPassword(
      destination,
      this.connectionTestRequest.id,
      this.connectionTestRequest.desttypeid
    )
    const destinationVersion = await lookupDestinationVersion(
      destination,
      this.connectionTestRequest.id,
      this.connectionTestRequest.desttypeid
    )
    const hl7QueryTestResult: ConnectionTestResult = {
      name: TEST_NAME,
      order: this.connectionTestRequest.order,
      message: '',
      detail: null,
      status: this.status,
    }

    const setRequestBody = (version: string) => {
      if (version === '2011') {
        requestBody = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
      <soap:Body>
      <ns3:submitSingleMessage xmlns:ns3="urn:cdc:iisb:2011">
      <ns3:username>${destination?.username}</ns3:username>
      <ns3:password>${destination?.password}</ns3:password>
      <ns3:facilityID>${destination?.facility_id}</ns3:facilityID>
      <ns3:hl7Message>MSH|^~\&amp;|${destination?.MSH3}|${destination?.MSH4}|${
          destination?.MSH5
        }|${destination?.MSH6}|${
          moment().format('YYYYMMDDHHmmss').concat('.000') +
          date.getTimezoneOffset()
        }||QBP^Q11^QBP_Q11|${randomUUID}|T|2.5.1|||ER|AL|||||Z34^CDCPHINVS|${
          destination?.MSH22
        }|QPD|Z34^Request Immunization History^CDCPHINVS|${randomUUID}|112258-9^^^ND^MR|JohnsonIZG^JamesIZG^AndrewIZG^^^^L|LeungIZG^SarahIZG^^^^^M|20160414|M|Main Street&amp;&amp;123^^Alexander^ND^58831^^L|^PRN^PH^^^555^5551111|Y|1RCP|I|10^RD&amp;Records&amp;HL70126</ns3:hl7Message>
      </ns3:submitSingleMessage>
      </soap:Body>
      </soap:Envelope>`
      } else {
        requestBody = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:urn="urn:cdc:iisb:hub:2014" xmlns:urn1="urn:cdc:iisb:2014">
        <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
          <wsa:Action>urn:cdc:iisb:hub:2014:IISHubPortType:SubmitSingleMessageRequest</wsa:Action>
          <wsa:MessageID>${randomUUID}</wsa:MessageID>
        </soap:Header>
        <soap:Body>
          <urn1:SubmitSingleMessageRequest>
          <urn1:Username>${destination?.username}</urn1:Username>
      <urn1:Password>${password}</urn1:Password>
            <urn1:FacilityID>${destination?.facility_id}</urn1:FacilityID>
            <urn1:Hl7Message>MSH|^~\&amp;|${destination?.MSH3}|${
          destination?.MSH4
        }|${destination?.MSH5}|${destination?.MSH6}|${
          moment().format('YYYYMMDDHHmmss').concat('.000') +
          date.getTimezoneOffset()
        }||QBP^Q11^QBP_Q11|${randomUUID}|T|2.5.1|||ER|AL|||||Z34^CDCPHINVS|${
          destination?.MSH22
        }|QPD|Z34^Request Immunization History^CDCPHINVS|${randomUUID}|112258-9^^^ND^MR|JohnsonIZG^JamesIZG^AndrewIZG^^^^L|LeungIZG^SarahIZG^^^^^M|20160414|M|Main Street&amp;&amp;123^^Alexander^ND^58831^^L|^PRN^PH^^^555^5551111|Y|1RCP|I|10^RD&amp;Records&amp;HL70126</urn1:Hl7Message>
            </urn1:SubmitSingleMessageRequest>
        </soap:Body>
      </soap:Envelope>`
      }
      return requestBody
    }

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

    const options = {
      hostname: this.connectionTestRequest.hostname,
      port: this.connectionTestRequest.port,
      path: this.connectionTestRequest.path,
      method: 'POST',
      agent: new https.Agent(httpsAgentOptions),
      headers: {
        Host: this.connectionTestRequest.hostname,
        'Content-Type': 'application/xml',
      },
    }
    const isResponsecorrect = (message) => {
      const qakElement: string[] = message[2].split('|')
      const msaElement: string[] = message[1].split('|')
      const msa1Values = ['AA', 'AE', 'CA', 'CE']

      if (
        qakElement[0] === 'QAK' &&
        qakElement[2] === 'NF' &&
        qakElement[3].includes('Z34^Request Complete') &&
        message[3].includes('QPD') &&
        msa1Values.includes(msaElement[1])
      ) {
        return true
      } else {
        return false
      }
    }
    const isFaultPresent = (res) => {
      if (res['soap:Envelope']['soap:Body'][0].hasOwnProperty(['soap:Fault'])) {
        return true
      } else {
        return false
      }
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
            const elementName = 'SubmitSingleMessageResponse'
            const result = xmlDoc.documentElement.getElementsByTagNameNS(
              '*',
              elementName
            )[0]
            let responseMessage: Element | null = null
            if (result) {
              responseMessage = result as unknown as Element
            }
            logger.debug('HL7 Message: ' + responseMessage?.textContent)
            if (!responseMessage?.textContent) {
              resolve([
                {
                  ...hl7QueryTestResult,
                  detail: responseMessage?.textContent,
                  message: TestResponseMessages.HL7MESSAGE_NOT_PRESENT,
                  status: TestStatus.FAIL,
                },
              ])
            } else {
              try {
                const splitMessage: string[] =
                  responseMessage.textContent?.split('\r') ?? []
                let isError = false

                for (const mes of splitMessage) {
                  if (mes.includes('ERR|') && mes.split('|')[4] === 'E') {
                    isError = true
                    resolve([
                      {
                        ...hl7QueryTestResult,
                        detail: responseMessage.textContent,
                        message: TestResponseMessages.ERROR_IN_HL7MESSAGE,
                        status: TestStatus.FAIL,
                      },
                    ])
                    break
                  }
                }
                if (!isError && isResponsecorrect(splitMessage)) {
                  resolve([
                    {
                      ...hl7QueryTestResult,
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
        } else if (res.statusCode === 500) {
          try {
            res.on('data', (chunk) => {
              data = data + chunk.toString()
            })

            res.on('end', function () {
              xml2js.parseString(data, (_err, result) => {
                if (isFaultPresent(result)) {
                  resolve([
                    {
                      ...hl7QueryTestResult,
                      detail: responseMessage,
                      message: TestResponseMessages.FAULT_IN_RESPONSE,
                      status: TestStatus.FAIL,
                    },
                  ])
                }
              })
            })
          } catch (error) {
            resolve([
              {
                ...hl7QueryTestResult,
                detail: error?.message,
                message: TestResponseMessages.SERVER_ERROR,
                status: TestStatus.FAIL,
              },
            ])
          }
        } else {
          resolve([
            {
              ...hl7QueryTestResult,
              message: TestResponseMessages.SERVER_ERROR,
              status: TestStatus.FAIL,
            },
          ])
        }
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
      req.write(setRequestBody(destinationVersion))
      req.end()
    })
  }
}

async function lookupDestinationPassword(
  destination: any,
  destId: any,
  destType: any
) {
  let data
  if (destination.configuration === 'deploy') {
    data = await prismacontext.prisma
      .$queryRaw`SELECT password FROM destination_change_request where dest_id=${destId} and dest_type=${destType}`
    return data[0].password
  } else if (destination.configuration === 'edit') {
    if (_.isEmpty(destination.newPassword)) {
      data = await prismacontext.prisma.$queryRaw<
        any[]
      >`SELECT password FROM destinations where dest_id=${destId} and dest_type=${destType}`
      return data[0].password
    } else {
      return destination.newPassword
    }
  } else {
    //Request from test connection page
    data = await prismacontext.prisma.$queryRaw<
      any[]
    >`SELECT password FROM destinations where dest_id=${destId} and dest_type=${destType}`
    return data[0].password
  }
}

async function lookupDestinationVersion(
  destination: any,
  destId: any,
  destType: any
) {
  if (destination.dest_version) {
    return destination.dest_version
  } else {
    const result = await prismacontext.prisma.$queryRaw`SELECT dest_version
    FROM destinations d
    WHERE d.dest_id = ${destId}
    AND d.dest_type = ${destType}`
    if (result[0].dest_version === '') {
      return '2014'
    } else {
      return result[0].dest_version
    }
  }
}
