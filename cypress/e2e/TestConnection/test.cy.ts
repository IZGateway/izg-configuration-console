const testElements = {
  progressBar: '#progress-bar',
  skeleton: '#skeleton',
  close: '#close',
  rerun: '#rerun',
  print: '#print',
  error: '.error-message',
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
  before(() => {
    cy.visit('/')
    cy.loginByOkta(Cypress.env('auth_username'), Cypress.env('auth_password'))
    cy.get(`#history_2_${destination}`).click()
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

  it('should rerun all tests when user clicks on "re run test" button', () => {
    cy.get(testElements.rerun).click()
    assert.exists(cy.get(testElements.skeleton))
  })

  it('should have clickable print button', () => {
    cy.get(testElements.print).should('be.visible')
    cy.get(testElements.print).should('be.enabled')
  })

  it('should have clickable close button', () => {
    cy.get(testElements.close).should('be.visible')
    cy.get(testElements.close).should('be.enabled')
  })

  describe('for "dev" destination, which has all tests passed', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/test/dev')
      cy.get(testElements.progressBar, { timeout: 50000 }).should('be.visible')
    })

    it('should show PASS status for all tests', () => {
      tests.forEach((test) => {
        cy.get(`[id='${test}']`)
          .children('div')
          .eq(2)
          .should('have.text', 'PASS')
      })
    })
    it('should show 100% passed in progress bar', () => {
      cy.get(testElements.progressBar).should('have.text', '100% Passed')
    })
  })

  describe('for "invalid" destination, which has all tests failed', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/test/invalid')
      cy.get(testElements.progressBar, { timeout: 50000 }).should('be.visible')
    })

    it('should have FAIL status for all tests', () => {
      tests.forEach((test) => {
        cy.get(`[id='${test}']`)
          .children('div')
          .eq(2)
          .should('have.text', 'FAIL')
      })
    })
    it('should show 100% passed in progress bar', () => {
      cy.get(testElements.progressBar).should('have.text', '0% Passed')
    })
    it('should show error messages for each tests', () => {
      cy.get(testElements.error).should('have.length', 7)
    })
  })
})
