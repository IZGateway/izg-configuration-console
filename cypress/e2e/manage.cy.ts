const manageElements={
  title: '#title-table',
  header: 'div.MuiDataGrid-columnHeader',
  pagination: 'div.MuiTablePagination-root'
}


describe('As a user, on manage connections page', () => {

  beforeEach (() => {
    cy.visit('http://localhost:3000/manage');
  })

    it('should have "My connections" as title of the table', () => {
      cy.get(manageElements.title).should('have.text', 'My Connections');
    })

    it('should have correct columns in defined order', () => {
      const expectedHeaders = ['ENVIRONMENT','JURISDICTION','ENDPOINT URL','STATUS','ACTION'];
      cy.get(manageElements.header).should('have.length',5)
      cy.get(manageElements.header).each(($el,index) =>{
        const actualHeaders = $el.toArray().map(el => el.innerText)
        assert.equal(actualHeaders.toString(), expectedHeaders[index].toString())
      })
    })

    it('should have pagination on table', () => {
      assert.exists(cy.get(manageElements.pagination));
    })

    it('should have edit, history, policy buttons in actions column', () => {
      cy.get('[data-field="action"]').each(() => {
        assert.exists(cy.get('#edit'))
        assert.exists(cy.get('#history'))
        assert.exists(cy.get('#policy'))
      })
    })
})