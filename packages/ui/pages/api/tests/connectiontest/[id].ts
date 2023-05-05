import { URL } from "url";
import apolloClientFactory from "../../../../lib/apollo-client";
import { FETCH_DESTINATION } from "../../../../lib/queries/fetch";
import type { NextApiRequest, NextApiResponse } from "next";
import { constants } from "http2";
import { ConnectionTestRequest } from "../../../../lib/connectiontests/types/ConnectionTestRequest";
import { ConnectionTestResult } from "../../../../lib/connectiontests/types/ConnectionTestResult";
import ConnectionTestFactory from "../../../../lib/connectiontests/ConnectionTestFactory";
import { APIResponse } from "../../../../lib/connectiontests/types/APIResponse";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse<APIResponse>
) {
  const DEFAULT_PORT = 443;
  const {
    query: { id },
    method,
  } = request;
  const testSuite: string[] = [
    "dns",
    "tcp",
    "tls",
    "cipher",
    "wsdl",
    "connectivity",
    "qbp",
  ];
  const testResults: ConnectionTestResult[] = [];

  const destination = await lookupDestinationURL(id);

  if (!destination) {
    response.status(constants.HTTP_STATUS_NOT_FOUND).json({
      destId: id,
      destUrl: "unknown",
      destType: "",
      jurisdictionDescription: "",
      testResults: [
        {
          name: "",
          detail:
            "No tests were run because the requested destination was not found.",
          status: null,
          order: -1,
          message: `The requested destination ${id} was not found in our records.`,
        },
      ],
    });
  }

  if (destination && !isValidUrl(destination.data?.destinationById.dest_uri)) {
    response.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
      destId: id as string,
      destUrl: destination.data?.destinationById.dest_uri,
      destType: destination.data?.destinationById.dest_type.type,
      jurisdictionDescription:
        destination.data?.destinationById.jurisdiction.description,
      testResults: [
        {
          name: "",
          detail:
            "No tests were run because the requested destination's URL is malformed.",
          status: null,
          order: -1,
          message: `The URL retrieved for ${id} is malformed`,
        },
      ],
    });
  }

  const IZG_ENDPOINT_CRT_PATH = process.env.IZG_ENDPOINT_CRT_PATH || undefined;
  const IZG_ENDPOINT_KEY_PATH = process.env.IZG_ENDPOINT_KEY_PATH || undefined;
  const IZG_ENDPOINT_PASSCODE = process.env.IZG_ENDPOINT_PASSCODE || undefined;

  const destIdURL = convertUrlStringToUrlObject(
    destination?.data?.destinationById.dest_uri
  );

  const connectionTestRequest: ConnectionTestRequest = {
    ip: "",
    port: +destIdURL.port || DEFAULT_PORT,
    hostname: destIdURL.hostname,
    path: destIdURL.pathname,
    id: id as string,
    order: 0,
    certPath: IZG_ENDPOINT_CRT_PATH,
    keyPath: IZG_ENDPOINT_KEY_PATH,
    passphrase: IZG_ENDPOINT_PASSCODE,
  };

  console.info(
    "STARTING TESTS ON DEST ID: " +
      id +
      " USING URL: " +
      connectionTestRequest.hostname +
      " ON PORT: " +
      connectionTestRequest.port
  );

  let testCounter = 0;
  for (const test of testSuite) {
    console.info("running test: " + test);
    connectionTestRequest.order = ++testCounter;
    const T = ConnectionTestFactory.getConnectionTest(
      test,
      connectionTestRequest
    );
    const result = await T.run();
    testResults.push(...result);
    if (test === "dns" && result[0]?.detail?.address) {
      console.debug("Resolved IP address is: " + result[0]?.detail?.address);
      connectionTestRequest.ip = result[0]?.detail?.address;
    }
  }

  response.status(200).json({
    destId: id || "unknown",
    destUrl: destIdURL.hostname || "unknown",
    destType: destination.data?.destinationById.dest_type.type || "unknown",
    jurisdictionDescription:
      destination.data?.destinationById.jurisdiction?.description || "unknown",
    testResults: testResults,
  });
}

async function lookupDestinationURL(destId: string | string[]) {
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

const convertUrlStringToUrlObject = (urlString: string) => {
  return new URL(urlString);
};

const isValidUrl = (urlString: string) => {
  try {
    return Boolean(new URL(urlString));
  } catch (e) {
    return false;
  }
};
