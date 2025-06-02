const facilityAndMSHValidationMessage =
  'Value must be between 0-25 characters and must contain only A-Z, a-z, 0-9, _, -, and space characters. It must not contain |^&~"/ characters'

const validationRules = {
  newPassword: {
    regex:
      /^(?=(?:.*\d){2})(?=(?:.*[a-z]){2})(?=(?:.*[A-Z]){2})(?=(?:.*[!@#$%^()&]){2}).{15,}$/,
    message:
      'Passwords must have a length of 15 characters. Passwords must include at least 2 of each: Numbers (0 through 9), Lowercase letters (a through z), Uppercase letters (A through Z), and Special Characters (!@#$%^()&)',
  },
  confirmPassword: {
    regex:
      /^(?=(?:.*\d){2})(?=(?:.*[a-z]){2})(?=(?:.*[A-Z]){2})(?=(?:.*[!@#$%^()&]){2}).{15,}$/,
    message:
      'Passwords must have a length of 15 characters. Passwords must include at least 2 of each: Numbers (0 through 9), Lowercase letters (a through z), Uppercase letters (A through Z), and Special Characters (!@#$%^()&)',
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
  RXA11: {
    regex: /^[A-Za-z0-9_-]{0,25}$/,
    message: facilityAndMSHValidationMessage,
  },
  username: {
    regex: /^[A-Za-z0-9_\-.]{0,25}$/,
    message: facilityAndMSHValidationMessage,
  },
}
export default validationRules
