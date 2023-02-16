import ConnectionTest from "../ConnectionTest";
import { ConnectionTestRequest } from "../types/ConnectionTestRequest";
import { ConnectionTestResult } from "../types/ConnectionTestResult";
import { TestStatus } from "../TestStatus";
import https from "https";
import { TestResponseMessages } from "../TestResponseMessages";
var fs = require("fs");
import path from "path";


const TEST_NAME = "Cipher Suites Appropriate";
export default class CIPHER extends ConnectionTest {
  private static readonly IZG_ACCEPTED_FIPS_CIPHERS: string[] = [
    "TLS_AES_256_GCM_SHA384",
    "TLS_AES_128_GCM_SHA256",
    "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
    "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384",
    "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
    "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256",
    "TLS_DHE_RSA_WITH_AES_256_GCM_SHA384",
    "TLS_DHE_DSS_WITH_AES_256_GCM_SHA384",
    "TLS_DHE_RSA_WITH_AES_128_GCM_SHA256",
    "TLS_DHE_DSS_WITH_AES_128_GCM_SHA256",
  ];

  constructor(connectionTestRequest: ConnectionTestRequest) {
    super(connectionTestRequest);
  }

  run = (): Promise<ConnectionTestResult[]> => {
    const cipherConnectionTestResult: ConnectionTestResult = {
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
            ...cipherConnectionTestResult,
            detail: (res.socket as any).getCipher(),
            status: this.isAcceptableCipher(
              (res.socket as any).getCipher().standardName
            )
              ? TestStatus.PASS
              : TestStatus.FAIL,
          },
        ]);
      });

      req.on("error", (error) => {
        resolve([
          {
            ...cipherConnectionTestResult,
            detail: error,
            message: TestResponseMessages.UNKNOWN_ERROR(options.hostname),
            status: TestStatus.FAIL,
          },
        ]);
      });

      req.end();
    });
  };

  isAcceptableCipher(cipher: string) {
    if (this.isFIPSCipher(cipher) && !this.isCBCCipher(cipher)) {
      return true;
    }
    return false;
  }

  isFIPSCipher(cipher: string) {
    if (CIPHER.IZG_ACCEPTED_FIPS_CIPHERS.includes(cipher)) {
      return true;
    }
    return false;
  }

  isCBCCipher(cipher: string) {
    if (cipher.toLocaleLowerCase().includes("cbc")) {
      return true;
    }
    return false;
  }
}
