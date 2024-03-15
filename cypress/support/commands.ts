/// <reference types="cypress" />

const loginToOkta = (username: string, password: string) => {
  const name = 'Palak Patel'
  Cypress.log({
    displayName: 'OKTA LOGIN',
    message: [`🔐 Authenticating | ${username}`],
    autoEnd: false,
  })

  cy.visit('/')
  cy.contains('Sign in with Okta').click()
  cy.origin(
    Cypress.env('okta_domain'),
    { args: { username, password } },
    ({ username, password }) => {
      cy.get('input[name="identifier"]').clear().type(username)
      cy.get('[type="submit"]').click()
      // cy.get('[data-se="okta_password"]')
      //   .should('exist')
      //   .its('length')
      //   .then((length) => {
      //     if (length > 0) {
      //       cy.get('[data-se="okta_password"]').click()
      //     }
      //   })
      cy.get('input[name="credentials.passcode"]').type(password, {
        log: false,
      })
      cy.get('[type="submit"]').click()
    }
  )
  cy.get('#app-header', { timeout: 10000 }).should('contain', name)
}

const logOut = () => {
  Cypress.log({
    displayName: 'OKTA LOGOUT',
    message: [`Logging out`],
    autoEnd: false,
  })
  cy.get('#logout').click()
}

Cypress.Commands.add('loginByOkta', (username: string, password: string) => {
  loginToOkta(username, password)
})
Cypress.Commands.add('logOut', () => {
  logOut()
})
