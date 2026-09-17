const facilityAndMSHValidationMessage =
  'Value must be between 0-25 characters and must contain only A-Z, a-z, 0-9, _, -, and space characters. It must not contain |^&~"/ characters'
const maxUsernameLength = 50

const validationRules = {
  newPassword: {
    regex:
      /^(?!==)(?=(?:.*\d){2})(?=(?:.*[a-z]){2})(?=(?:.*[A-Z]){2})(?=(?:.*[!@#$%^()&]){2}).{15,}$/,
    message:
      'Passwords must have a length of 15 characters, must not start with ==, and must include at least 2 of each: Numbers (0 through 9), Lowercase letters (a through z), Uppercase letters (A through Z), and Special Characters (!@#$%^()&)',
  },
  confirmPassword: {
    regex:
      /^(?!==)(?=(?:.*\d){2})(?=(?:.*[a-z]){2})(?=(?:.*[A-Z]){2})(?=(?:.*[!@#$%^()&]){2}).{15,}$/,
    message:
      'Passwords must have a length of 15 characters, must not start with ==, and must include at least 2 of each: Numbers (0 through 9), Lowercase letters (a through z), Uppercase letters (A through Z), and Special Characters (!@#$%^()&)',
  },
  facilityId: {
    regex: /^[A-Za-z0-9_-]{0,25}$/,
    message: facilityAndMSHValidationMessage,
  },
  MSH3: {
    regex: /^[A-Za-z0-9_-]{0,25}$/,
    message: facilityAndMSHValidationMessage,
  },
  MSH22: {
    regex: /^[A-Za-z0-9_-]{0,25}$/,
    message: facilityAndMSHValidationMessage,
  },
  MSH4: {
    regex: /^[A-Za-z0-9_-]{0,25}$/,
    message: facilityAndMSHValidationMessage,
  },
  MSH5: {
    regex: /^[A-Za-z0-9_-]{0,25}$/,
    message: facilityAndMSHValidationMessage,
  },
  MSH6: {
    regex: /^[A-Za-z0-9_-]{0,25}$/,
    message: facilityAndMSHValidationMessage,
  },
  MSH11: {
    regex: /^[PT]$/,
    message: 'MSH-11 must be "P" or "T"',
  },
  RXA11: {
    regex: /^[A-Za-z0-9_-]{0,25}$/,
    message: facilityAndMSHValidationMessage,
  },
  username: {
    regex: new RegExp(`^[A-Za-z0-9_\\-.]{0,${maxUsernameLength}}$`),
    message: `Value must be between ${maxUsernameLength} characters and must contain only A-Z, a-z, 0-9, _, -, and space characters. It must not contain |^&~"/ characters`
  },
  // Mirrors the syntactic half of the destination URL specification enforced
  // server-side by lib/security/destinationUriGuard: https only, an FQDN under
  // an approved TLD, no query string and no embedded credentials. Kept in step
  // with APPROVED_HOSTNAME_PATTERN there.
  //
  // The guard's remaining rules cannot be evaluated in the browser - the port
  // allowlist is environment-configurable, and the "must resolve to a publicly
  // routable address" rule needs DNS - so the server 400 stays the backstop.
  // This rule exists to fail the user at the field they typed in rather than
  // four steps later.
  destUri: {
    regex:
      /^https:\/\/(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:gov|net|us|com|health|org|nyc|as|gu|pr|mp|fm)(?::\d{1,5})?(?:\/[^\s?#]*)?$/i,
    message:
      'Must be an https:// URL whose host is a fully qualified domain name ending in an approved top-level domain (for example https://registry.example.gov/path), with no query string and no embedded credentials',
  },
}
export default validationRules
