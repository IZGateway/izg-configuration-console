export class TestResponseMessages {
  public static readonly TCP_TIMEOUT =
    "The connection timed out.  Your endpoint must whitelist connections from {IZGW-ip-address}.";
  public static readonly TCP_REJECT =
    "The connection was rejected. Your endpoint must whitelist connections from {IZGW-ip-address}.";
  public static readonly DNS_LOOKUP_FAIL = (url: string) =>
    `There is no available DNS entry for ${url}`;
  public static readonly CIPHER_NOT_APPROPRIATE = (url: string) =>
    `${url} is not configured to support cipher suites that must be used to connect to IZ Gateway`;
  public static readonly TLS_VERSION_FAIL = (
    url: string,
    protocolVersion: String
  ) =>
    `IZ Gateway requires TLS 1.2 or 1.3. The endpoint at ${url} connected using ${protocolVersion} which is insecure.`;
  public static readonly UNKNOWN_ERROR = (url: string) =>
    `Unknown error trying to connect to ${url}`;
  public static readonly WSDL_NOT_SUPPORTED = (location: string) =>
    `The WSDL for this endpoint ${location} is not one of those supported by IZ Gateway.`;
  public static readonly WSDL_NOT_ACCESSED =
    "The WSDL {WSDL-location} for this endpoint could not be accessed.";
  public static readonly CONNECTIVITY_ECHOBACK_NOT_EXPECTED =
    "The echoback response did not contain the expected content.";
  public static readonly CONNECTIVITY_NOT_CONNECT =
    "We cannot connect to the url right now. Please try again later";
  public static readonly CONNECTIVITY_WARNING = (
    testEchoback: string,
    responseEchoback: string
  ) => `IZ Gateway expected ${testEchoback} but got back ${testEchoback}.`;
  public static readonly SERVER_ERROR = `We cannot connect right now. Please try again later`;
  public static readonly HL7MESSAGE_NOT_PRESENT = `Response message did not contain any HL7 message`;
  public static readonly HL7MESSAGE_CANNOT_PARSE = `There is an error parsing HL7 message from response message`;
  public static readonly ERROR_IN_HL7MESSAGE = `HL7 message is reported back as an error`;
  public static readonly MESSAGE_VALIDATION_FAIL = `The response indicated a failure in HL7 Message validations`;
  public static readonly FAULT_IN_RESPONSE = `Soap fault has been reported in response`;
}
