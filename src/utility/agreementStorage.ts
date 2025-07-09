// IGDD-1853 - Store in session if a user has accepted connection edit agreement
// Moved here for unit testing
const authorizationAgreementKey = `authorization-agreement-accepted`

export const hasAcceptedAgreement = (): boolean => {
  return sessionStorage.getItem(authorizationAgreementKey) === 'true'
}

export const setAcceptedAgreement = () => {
  sessionStorage.setItem(authorizationAgreementKey, 'true')
}

export const clearAcceptedAgreement = (): void => {
  sessionStorage.removeItem(authorizationAgreementKey)
}
