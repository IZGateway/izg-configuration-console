import { ApolloServer } from "apollo-server";
import {
  ApolloServerPluginLandingPageGraphQLPlayground,
  ApolloServerPluginLandingPageDisabled,
} from "apollo-server-core";
import { resolvers, typeDefs } from "./schema";
import { context } from "./context";
import fetch from "node-fetch";
import path from "path";
import fs from "fs";
import https from "https";

const ONE_HOUR_MILLISECONDS = 3600000;
export const IZG_STATUS_UPDATE_POLL_RATE =
  parseInt(<string>process.env.IZG_STATUS_UPDATE_POLL_RATE) ||
  ONE_HOUR_MILLISECONDS;
const IZG_STATUS_ENDPOINT_URL =
  process.env.IZG_STATUS_ENDPOINT_URL || "unknown";
const IZG_ENDPOINT_CRT_PATH = process.env.IZG_ENDPOINT_CRT_PATH || undefined;
const IZG_ENDPOINT_KEY_PATH = process.env.IZG_ENDPOINT_KEY_PATH || undefined;
const IZG_ENDPOINT_PASSCODE = process.env.IZG_ENDPOINT_PASSCODE || undefined;

const httpsAgentOptions = {
  cert: fs.readFileSync(path.resolve(IZG_ENDPOINT_CRT_PATH), `utf-8`),
  key: fs.readFileSync(path.resolve(IZG_ENDPOINT_KEY_PATH), "utf-8"),
  passphrase: IZG_ENDPOINT_PASSCODE,
  rejectUnauthorized: false,
  keepAlive: true,
};

const sslConfiguredAgent = new https.Agent(httpsAgentOptions);

const fetchEndpointStatus = async () => {
  try {
    const response = await fetch(IZG_STATUS_ENDPOINT_URL, {
      agent: sslConfiguredAgent,
      timeout: 30000,
    });
    if (!response.ok) {
      const message = `An error has occured: ${response.status}`;
      throw new Error(message);
    }
    const statusResponse = await response.json();
    const runtime = new Date();
    const statuses = Object.entries(statusResponse).map(
      ([key, value]: [any, any]) => ({
        dest_id: value.id,
        status: value.status,
        detail: value.detail,
        diagnostics: value.diagnostics,
        retry_strategy: value.retryStrategy,
        ran_at: runtime,
      })
    );
    await context.prisma.endpointstatus.createMany({ data: statuses });
    statuses.length = 0;
  } catch (error) {
    console.log("ERROR ---> " + error);
  }
};

function startPollingIZGStatus() {
  console.info("STATUS POLLING STARTED...");
  setInterval(async function () {
    console.debug("Fetching status....");
    fetchEndpointStatus();
  }, IZG_STATUS_UPDATE_POLL_RATE);
}

new ApolloServer({
  resolvers,
  typeDefs,
  context: context,
  introspection: process.env.NODE_ENV !== "production",
  plugins: [
    process.env.NODE_ENV === "production"
      ? ApolloServerPluginLandingPageDisabled()
      : ApolloServerPluginLandingPageGraphQLPlayground(),
  ],
}).listen({ port: 4000 }, () =>
  console.log(`
🚀 Server ready at: http://localhost:4000
⭐️ See sample queries: http://pris.ly/e/ts/graphql-sdl-first#using-the-graphql-api`)
);

fetchEndpointStatus();
startPollingIZGStatus();
