import fs from "fs";
import path from "path";
import { ServiceProvider } from "saml2-js";

const IZG_ENDPOINT_CERT_DIR_PATH =
  process.env.IZG_ENDPOINT_CERT_DIR_PATH || "unknown";

export const serviceProvider = new ServiceProvider({
  entity_id: "saml-poc",
  private_key: fs
    .readFileSync(path.resolve(IZG_ENDPOINT_CERT_DIR_PATH, "key.pem"))
    .toString(),
  certificate: fs
    .readFileSync(path.resolve(IZG_ENDPOINT_CERT_DIR_PATH, "cert.pem"))
    .toString(),
  assert_endpoint: "http://localhost:3000/api/auth/signin/saml",
  allow_unencrypted_assertion: true,
});
