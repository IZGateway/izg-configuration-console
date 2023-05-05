import ConnectionTest from "../ConnectionTest";
import { ConnectionTestRequest } from "../types/ConnectionTestRequest";
import { ConnectionTestResult } from "../types/ConnectionTestResult";
import { TestStatus } from "../TestStatus";
import https from "https";
import { TestResponseMessages } from "../TestResponseMessages";
var fs = require("fs");
import path from "path";

const TEST_NAME = "TLS Version Test";
export default class TLS extends ConnectionTest {
  private static readonly MIN_TLS_VERSION: string = "TLSv1.2";
  private static readonly MAX_TLS_VERSION: string = "TLSv1.3";

  constructor(connectionTestRequest: ConnectionTestRequest) {
    super(connectionTestRequest);
  }

  run = (): Promise<ConnectionTestResult[]> => {
    const dnsConnectionTestResult: ConnectionTestResult = {
      name: TEST_NAME,
      order: this.connectionTestRequest.order,
      message: "",
      detail: null,
      status: this.status,
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
      agent: new https.Agent(httpsAgentOptions),
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        resolve([
          {
            ...dnsConnectionTestResult,
            detail: (res.socket as any).getProtocol(),
            message: this.isGoodTLSVersion((res.socket as any).getProtocol())
              ? ""
              : TestResponseMessages.TLS_VERSION_FAIL(
                  options.hostname,
                  (res.socket as any).getProtocol()
                ),
            status: this.isGoodTLSVersion((res.socket as any).getProtocol())
              ? TestStatus.PASS
              : TestStatus.FAIL,
          },
        ]);
      });

      req.on("error", (error) => {
        resolve([
          {
            ...dnsConnectionTestResult,
            detail: error,
            message: TestResponseMessages.UNKNOWN_ERROR(options.hostname),
            status: TestStatus.FAIL,
          },
        ]);
      });

      req.end();
    });
  };

  isGoodTLSVersion(connectedProtocol: string): boolean {
    if (
      connectedProtocol === TLS.MIN_TLS_VERSION ||
      connectedProtocol === TLS.MAX_TLS_VERSION
    ) {
      return true;
    }
    return false;
  }
}
