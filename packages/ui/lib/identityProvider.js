import fs from "fs";
import path from "path";
import { IdentityProvider } from "saml2-js";

const IZG_ENDPOINT_CERT_DIR_PATH =
  process.env.IZG_ENDPOINT_CERT_DIR_PATH || "unknown";

export const identityProvider = new IdentityProvider({
  sso_login_url: "http://localhost:8080/simplesaml/saml2/idp/SSOService.php",
  certificates: [
    fs
      .readFileSync(path.resolve(IZG_ENDPOINT_CERT_DIR_PATH, "idp_key.pem"))
      .toString(),
  ],
});
