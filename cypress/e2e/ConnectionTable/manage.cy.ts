const manageElements = {
  title: '#title-table',
  header: 'div.MuiDataGrid-columnHeader',
  pagination: 'div.MuiTablePagination-root',
  export: 'export',
}

describe('As a user, on manage connections page', () => {
  before(() => {
    cy.visit('/')
    cy.loginByOkta(Cypress.env('auth_username'), Cypress.env('auth_password'))
  })

  it('should have "My connections" as title of the table', () => {
    cy.get(manageElements.title).should('have.text', 'My Connections')
  })

  it('should have correct columns in defined order', () => {
    const expectedHeaders = [
      'ENVIRONMENT',
      'ORGANIZATION',
      'ENDPOINT URL',
      'STATUS',
      'ACTION',
    ]
    cy.get(manageElements.header).should('have.length', 5)
    cy.get(manageElements.header).each(($el, index) => {
      const actualHeaders = $el.toArray().map((el) => el.innerText)
      assert.equal(actualHeaders.toString(), expectedHeaders[index].toString())
    })
  })

  it('should have pagination on table', () => {
    assert.exists(cy.get(manageElements.pagination))
  })

  it('should have edit or change request, history, test buttons in actions column', () => {
    cy.get('[data-field="action"] div a').each((action) => {
      cy.wrap(action)
        .invoke('attr', 'href')
        .then((href) => {
          expect(href).to.satisfy(
            (text) =>
              text.includes('edit') ||
              text.includes('changerequest') ||
              text.includes('history') ||
              text.includes('test')
          )
        })
    })
  })

  it('should have Export option on table', () => {
    assert.exists(cy.get('[data-testid="SaveAltIcon"]'))
  })

  it('should have filters option on table', () => {
    assert.exists(cy.get('[data-testid="FilterListIcon"]'))
  })

  it('should have search bar on table', () => {
    assert.exists(cy.get('[data-testid="SearchIcon"]'))
  })

  after(() => {
    cy.logOut()
  })
})
