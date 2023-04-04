const historyElements={
  title: '#title-history',
  connectionInfo: '#connection-info',
  testHistory: '#test-history',
  close: '#close',
  manageTitle: '#title-table'
}

describe('As a user, on manage connections page', () => {

  describe('when clicks on edit button for alaska connection', () => {
  
  const destination= 'ak';

  beforeEach (() => {
    cy.visit('http://localhost:3000/manage');
    cy.get(`[data-id="${destination}"]`).find('#history').click()
  })

    it('should open "Connection History" page for the destination', () => {
      cy.get(historyElements.title).should('have.text', 'Connection History');
    })

    it('should have "Connection Info" section', () => {
      assert.exists(cy.get(historyElements.connectionInfo));
    })

    it('should have "Test History" section', () => {
      assert.exists(cy.get(historyElements.testHistory));
    })

    it('should navigate back to manage connections page when "Close" button is clicked', () => {
      cy.get(historyElements.close).click();
      cy.get(historyElements.manageTitle).should('have.text', 'My Connections');
    })
  })
})