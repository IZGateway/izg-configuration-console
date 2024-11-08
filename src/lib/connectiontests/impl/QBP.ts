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
import { json2xml } from 'xml-js'

const TEST_NAME = 'HL7 Query Test'
const randomUUID = uuidv4()
let hl7Message: string
let requestBody: string
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
    const setRequestBody = (version: string) => {
      /* Production destinations, or non-production destinations in above list us MSH11 value of P, other non-production require T. */
      const msh11 =
        destination.dest_type == 5 ||
        normalOnboardingDestinations.includes(destination.dest_id)
          ? 'P'
          : 'T'

      const hl7msg = `MSH|^~\\&amp;|${destination?.MSH3}|${destination?.MSH4}|${
        destination?.MSH5
      }|${destination?.MSH6}|${moment().format(
        'YYYYMMDDHHmmssZZ'
      )}||QBP^Q11^QBP_Q11|${randomUUID}|${msh11}|2.5.1|||ER|AL|||||Z34^CDCPHINVS|${
        destination?.MSH22
      }|
QPD|Z34^Request Immunization History^CDCPHINVS|${randomUUID.replace(
        /-/g,
        ''
      )}|112258-9^^^ND^MR|JohnsonIZG^JamesIZG^AndrewIZG^^^^L|LeungIZG^SarahIZG^^^^^M|20160414|M|Main Street&amp;&amp;123^^Alexander^ND^58831^^L|^PRN^PH^^^555^5551111|Y|1
RCP|I|10^RD&amp;Records&amp;HL70126`

      if (version !== '2014') {
        // 2011 is default value if not set
        requestBody = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
      <soap:Body>
      <iis:submitSingleMessage xmlns:iis="urn:cdc:iisb:2011">
      <iis:username>${destination?.username}</iis:username>
      <iis:password>${password}</iis:password>
      <iis:facilityID>${destination?.facility_id}</iis:facilityID>
      <iis:hl7Message>${hl7msg}</iis:hl7Message>
      </iis:submitSingleMessage>
      </soap:Body>
      </soap:Envelope>`
      } else {
        requestBody = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:iis="urn:cdc:iisb:2014">
        <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
          <wsa:Action>urn:cdc:iisb:2014:IISPortType:SubmitSingleMessageRequest</wsa:Action>
          <wsa:MessageID>${randomUUID}</wsa:MessageID>
        </soap:Header>
        <soap:Body>
          <iis:SubmitSingleMessageRequest>
            <iis:Username>${destination?.username}</iis:Username>
            <iis:Password>${password}</iis:Password>
            <iis:FacilityID>${destination?.facility_id}</iis:FacilityID>
            <iis:Hl7Message>${hl7msg}</iis:Hl7Message>
          </iis:SubmitSingleMessageRequest>
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
    const isVersion2014 = destination.dest_version !== '2011'
    const options = {
      hostname: this.connectionTestRequest.hostname,
      port: this.connectionTestRequest.port,
      path: this.connectionTestRequest.path,
      method: 'POST',
      agent: new https.Agent(httpsAgentOptions),
      headers: {
        Host: this.connectionTestRequest.hostname,
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
            logger.info('SOAP Message: ' + data)
            if (!responseMessage?.textContent) {
              resolve([
                {
                  ...hl7QueryTestResult,
                  detail: null,
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
              resolve([
                {
                  ...hl7QueryTestResult,
                  detail: result,
                  message: `Server responded with HTTP status code ${
                    res.statusCode
                  }. Response is: ${json2xml(result, {
                    compact: true,
                  })}`,
                  status: TestStatus.FAIL,
                },
              ])
            })
          })
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
