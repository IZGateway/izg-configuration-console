const homeElements = {
  appHeader: '#app-header',
  navigation: '#navigation',
}

describe('As a user, on Home page', () => {
  before(() => {
    cy.visit('/')
    cy.loginByOkta(Cypress.env('auth_username'), Cypress.env('auth_password'))
  })

  it('should see app header bar', () => {
    assert.exists(cy.get(homeElements.appHeader))
  })

  it('should have navigation side menu', () => {
    assert.exists(cy.get(homeElements.navigation))
  })

  after(() => {
    cy.logOut()
  })
})
