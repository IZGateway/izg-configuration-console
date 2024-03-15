const testElements = {
  progressBar: '#progress-bar',
  close: '#close',
  rerun: '#rerun',
  print: '#print',
  error: '.error-message',
  manageTitle: '#title-table',
}

const tests = [
  'DNS Lookup Test',
  'TCP Connectivity Test',
  'TLS Version Test',
  'Cipher Suites Appropriate',
  'WSDL Test',
  'Connectivity Test',
  'HL7 Query Test',
]

describe('As a user, on Test History page for "dev" destination', () => {
  const destination = 'dev'
  const destId = 2
  before(() => {
    cy.visit('/')
    cy.loginByOkta(Cypress.env('auth_username'), Cypress.env('auth_password'))
    cy.visit(`/test/${destId}/${destination}`)
    cy.get(testElements.progressBar, { timeout: 50000 }).should('be.visible')
  })

  it('should have progress bar displayed', () => {
    assert.exists(cy.get(testElements.progressBar))
  })

  it('should have all tests', () => {
    tests.forEach((test) => {
      assert.exists(cy.get(`[id='${test}']`))
    })
  })

  it('should have clickable rerun test button', () => {
    cy.get(testElements.rerun).should('be.visible')
    cy.get(testElements.rerun).should('be.enabled')
  })

  it('should have clickable print button', () => {
    cy.get(testElements.print).should('be.visible')
    cy.get(testElements.print).should('be.enabled')
  })

  it('should have clickable close button', () => {
    cy.get(testElements.close).should('be.visible')
    cy.get(testElements.close).should('be.enabled')
  })

  describe('when "Close" button is clicked', () => {
    it('should navigate back to manage connections page', () => {
      cy.get(testElements.close).click()
      cy.get(testElements.manageTitle).should('have.text', 'My Connections')
    })
  })

  after(() => {
    cy.logOut()
  })
})
