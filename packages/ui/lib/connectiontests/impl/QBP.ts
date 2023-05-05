import ConnectionTest from "../ConnectionTest";
import { ConnectionTestRequest } from "../types/ConnectionTestRequest";
import { ConnectionTestResult } from "../types/ConnectionTestResult";
import { TestStatus } from "../TestStatus";
import https from "https";
import { TestResponseMessages } from "../TestResponseMessages";
import * as fs from "fs";
import path from "path";
import apolloClientFactory from "../../apollo-client";
import { FETCH_DESTINATION } from "../../queries/fetch";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";

let xml2js = require("xml2js");
const TEST_NAME = "HL7 Query Test";
let randomUUID = uuidv4();
const date = new Date();
let hl7Message;
let requestBody;
let responseMessage;

export default class QBP extends ConnectionTest {
  constructor(connectionTestRequest: ConnectionTestRequest) {
    super(connectionTestRequest);
  }

  run = async (): Promise<ConnectionTestResult[]> => {
    const destination = await lookupDestinationInfo(
      this.connectionTestRequest.id
    );

    const hl7QueryTestResult: ConnectionTestResult = {
      name: TEST_NAME,
      order: this.connectionTestRequest.order,
      message: "",
      detail: null,
      status: this.status,
    };

    const setRequestBody = (version) => {
      if (version === "2011") {
        requestBody = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
      <soap:Body>
      <ns3:submitSingleMessage xmlns:ns3="urn:cdc:iisb:2011">
      <ns3:username>${destination.data?.destinationById.username}</ns3:username>
      <ns3:password>${destination.data?.destinationById.password}</ns3:password>
      <ns3:facilityID>${
        destination.data?.destinationById.facility_id
      }</ns3:facilityID>
      <ns3:hl7Message>MSH|^~\&amp;|${destination.data?.destinationById.MSH3}|${
          destination.data?.destinationById.MSH4
        }|${destination.data?.destinationById.MSH5}|${
          destination.data?.destinationById.MSH6
        }|${
          moment().format("YYYYMMDDHHmmss").concat(".000") +
          date.getTimezoneOffset()
        }||QBP^Q11^QBP_Q11|${randomUUID}|T|2.5.1|||ER|AL|||||Z34^CDCPHINVS|${
          destination.data?.destinationById.MSH22
        }|QPD|Z34^Request Immunization History^CDCPHINVS|${randomUUID}|112258-9^^^ND^MR|JohnsonIZG^JamesIZG^AndrewIZG^^^^L|LeungIZG^SarahIZG^^^^^M|20160414|M|Main Street&amp;&amp;123^^Alexander^ND^58831^^L|^PRN^PH^^^555^5551111|Y|1RCP|I|10^RD&amp;Records&amp;HL70126</ns3:hl7Message>
      </ns3:submitSingleMessage>
      </soap:Body>
      </soap:Envelope>`;
      } else {
        requestBody = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:urn="urn:cdc:iisb:hub:2014" xmlns:urn1="urn:cdc:iisb:2014">
        <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
          <wsa:Action>urn:cdc:iisb:hub:2014:IISHubPortType:SubmitSingleMessageRequest</wsa:Action>
          <wsa:MessageID>${randomUUID}</wsa:MessageID>
        </soap:Header>
        <soap:Body>
          <urn1:SubmitSingleMessageRequest>
          <urn1:Username>${
            destination.data?.destinationById.username
          }</urn1:Username>
      <urn1:Password>${
        destination.data?.destinationById.password
      }</urn1:Password>
            <urn1:FacilityID>${
              destination.data?.destinationById.facility_id
            }</urn1:FacilityID>
            <urn1:Hl7Message>MSH|^~\&amp;|${
              destination.data?.destinationById.MSH3
            }|${destination.data?.destinationById.MSH4}|${
          destination.data?.destinationById.MSH5
        }|${destination.data?.destinationById.MSH6}|${
          moment().format("YYYYMMDDHHmmss").concat(".000") +
          date.getTimezoneOffset()
        }||QBP^Q11^QBP_Q11|${randomUUID}|T|2.5.1|||ER|AL|||||Z34^CDCPHINVS|${
          destination.data?.destinationById.MSH22
        }|QPD|Z34^Request Immunization History^CDCPHINVS|${randomUUID}|112258-9^^^ND^MR|JohnsonIZG^JamesIZG^AndrewIZG^^^^L|LeungIZG^SarahIZG^^^^^M|20160414|M|Main Street&amp;&amp;123^^Alexander^ND^58831^^L|^PRN^PH^^^555^5551111|Y|1RCP|I|10^RD&amp;Records&amp;HL70126</urn1:Hl7Message>
            </urn1:SubmitSingleMessageRequest>
        </soap:Body>
      </soap:Envelope>`;
      }
      return requestBody;
    };

    const httpsAgentOptions = {
      cert: fs.readFileSync(
        path.resolve(this.connectionTestRequest.certPath),
        `utf-8`
      ),
      key: fs.readFileSync(
        path.resolve(this.connectionTestRequest.keyPath),
        "utf-8"
      ),
      passphrase: this.connectionTestRequest.passphrase,
      rejectUnauthorized: false,
      keepAlive: true,
    };

    const options = {
      hostname: this.connectionTestRequest.hostname,
      port: this.connectionTestRequest.port,
      path: this.connectionTestRequest.path,
      method: "POST",
      agent: new https.Agent(httpsAgentOptions),
      headers: {
        Host: this.connectionTestRequest.hostname,
        "Content-Type": "application/xml",
      },
    };

    const isResponsecorrect = (message) => {
      let qakElement: string[] = message[2].split("|");
      let msaElement: string[] = message[1].split("|");
      const msa1Values = ["AA", "AE", "CA", "CE"];

      if (
        qakElement[0] === "QAK" &&
        qakElement[2] === "NF" &&
        qakElement[3].includes("Z34^Request Complete") &&
        message[3].includes("QPD") &&
        msa1Values.includes(msaElement[1])
      ) {
        return true;
      } else {
        return false;
      }
    };

    const isHl7MessagePresent = (message) => {
      if (destination.data?.destinationById.dest_version === "2011") {
        if (message.hasOwnProperty("ns3:return")) {
          hl7Message = message["ns3:return"];
          return true;
        } else {
          return false;
        }
      } else {
        if (message.hasOwnProperty("Hl7Message")) {
          hl7Message = message["Hl7Message"];
          return true;
        } else {
          return false;
        }
      }
    };

    const isFaultPresent = (res) => {
      if (res["soap:Envelope"]["soap:Body"][0].hasOwnProperty(["soap:Fault"])) {
        return true;
      } else {
        return false;
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = "";

        if (res.statusCode == 200) {
          res.on("data", (chunk) => {
            data = data + chunk.toString();
          });

          res.on("end", function () {
            xml2js.parseString(data, options, (err, result) => {
              if (err) {
                console.log("An error has occurred: " + err);
                return;
              }
              if (destination.data?.destinationById.dest_version === "2011") {
                responseMessage =
                  result["soap:Envelope"]["soap:Body"][0][
                    "ns3:submitSingleMessageResponse"
                  ][0];
              } else {
                responseMessage =
                  result["soap:Envelope"]["soap:Body"][0][
                    "SubmitSingleMessageResponse"
                  ][0];
              }
              if (!isHl7MessagePresent(responseMessage)) {
                resolve([
                  {
                    ...hl7QueryTestResult,
                    detail: responseMessage,
                    message: TestResponseMessages.HL7MESSAGE_NOT_PRESENT,
                    status: TestStatus.FAIL,
                  },
                ]);
              } else {
                try {
                  let splitMessage: string[] = hl7Message
                    .toString()
                    .split("\r");
                  let isError = false;
                  splitMessage.forEach((mes) => {
                    if (mes.includes("ERR|") && mes.split("|")[4] == "E") {
                      isError = true;
                      resolve([
                        {
                          ...hl7QueryTestResult,
                          detail: hl7Message,
                          message: TestResponseMessages.ERROR_IN_HL7MESSAGE,
                          status: TestStatus.FAIL,
                        },
                      ]);
                    }
                  });
                  if (!isError && isResponsecorrect(splitMessage)) {
                    resolve([
                      {
                        ...hl7QueryTestResult,
                        status: TestStatus.PASS,
                      },
                    ]);
                  } else {
                    resolve([
                      {
                        ...hl7QueryTestResult,
                        detail: hl7Message,
                        message: TestResponseMessages.ERROR_IN_HL7MESSAGE,
                        status: TestStatus.PASS,
                      },
                    ]);
                  }
                } catch (error) {
                  resolve([
                    {
                      ...hl7QueryTestResult,
                      detail: error,
                      message: TestResponseMessages.HL7MESSAGE_CANNOT_PARSE,
                      status: TestStatus.FAIL,
                    },
                  ]);
                }
              }
            });

            resolve([
              {
                ...hl7QueryTestResult,
                detail: {},
                message:
                  TestResponseMessages.CONNECTIVITY_ECHOBACK_NOT_EXPECTED,
                status: TestStatus.FAIL,
              },
            ]);
          });
        } else if (res.statusCode == 500) {
          try {
            res.on("data", (chunk) => {
              data = data + chunk.toString();
            });

            res.on("end", function () {
              xml2js.parseString(data, options, (err, result) => {
                if (isFaultPresent(result)) {
                  resolve([
                    {
                      ...hl7QueryTestResult,
                      detail: responseMessage,
                      message: TestResponseMessages.FAULT_IN_RESPONSE,
                      status: TestStatus.FAIL,
                    },
                  ]);
                }
              });
            });
          } catch (error) {
            resolve([
              {
                ...hl7QueryTestResult,
                detail: error,
                message: TestResponseMessages.SERVER_ERROR,
                status: TestStatus.FAIL,
              },
            ]);
          }
        } else {
          resolve([
            {
              ...hl7QueryTestResult,
              message: TestResponseMessages.SERVER_ERROR,
              status: TestStatus.FAIL,
            },
          ]);
        }
      });

      req.on("error", (error) => {
        resolve([
          {
            ...hl7QueryTestResult,
            detail: error,
            message: TestResponseMessages.UNKNOWN_ERROR(options.hostname),
            status: TestStatus.FAIL,
          },
        ]);
      });
      req.write(setRequestBody(destination.data?.destinationById.dest_version));
      req.end();
    });
  };
}

async function lookupDestinationInfo(destId: string | string[]) {
  const apolloClient = await apolloClientFactory();
  return await queryDestination(destId, apolloClient);
}

const queryDestination = async (
  destId: String | string[],
  apolloClient: any
) => {
  return await apolloClient.query({
    query: FETCH_DESTINATION,
    variables: { destId: destId },
  });
};
