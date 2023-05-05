import ConnectionTest from "../ConnectionTest";
import { ConnectionTestRequest } from "../types/ConnectionTestRequest";
import { ConnectionTestResult } from "../types/ConnectionTestResult";
import { TestStatus } from "../TestStatus";
import net from "net";
import { TestResponseMessages } from "../TestResponseMessages";

const TEST_NAME = "TCP Connectivity Test";
export default class TCP extends ConnectionTest {
  private static readonly TIMEOUT_ERROR_CODE: string = "ETIMEDOUT";

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

    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.setTimeout(5000);
      client.connect(
        this.connectionTestRequest.port,
        this.connectionTestRequest.ip,
        function () {
          resolve([
            {
              ...dnsConnectionTestResult,
              status: TestStatus.PASS,
            },
          ]);
        }
      );

      client.on("error", (error: any) => {
        resolve([
          {
            ...dnsConnectionTestResult,
            detail: error,
            message: error
              ? error?.code === TCP.TIMEOUT_ERROR_CODE
                ? TestResponseMessages.TCP_TIMEOUT(
                    this.connectionTestRequest.ip
                  )
                : TestResponseMessages.TCP_REJECT(this.connectionTestRequest.ip)
              : "",
            status: TestStatus.FAIL,
          },
        ]);
      });

      client.end();
    });
  };
}
