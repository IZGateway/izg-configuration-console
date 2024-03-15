const historyElements = {
  title: '#title-history',
  connectionInfo: '#connection-info',
  testHistory: '#test-history',
  close: '#close',
  manageTitle: '#title-table',
  closeDetail: '#closeDetail',
  detail: '#detail',
  organization: '#organization',
  type: '#type',
  url: '#url',
  username: '#username',
  facilityId: '#facilityId',
  msh3: '#msh3',
  msh4: '#msh4',
  msh5: '#msh5',
  msh6: '#msh6',
  msh22: '#msh22',
  rxa11: '#rxa11',
  drawer: '#detailDrawer',
  changeHistory: '#change-history',
}

const destination = 'dev'
const destId = 2

describe('As a user, on manage connections page', () => {
  describe('when clicks on history button for alaska connection', () => {
    before(() => {
      cy.visit('/')
      cy.loginByOkta(Cypress.env('auth_username'), Cypress.env('auth_password'))
      cy.visit(`/history/${destId}/${destination}`)
      cy.get(historyElements.connectionInfo, { timeout: 10000 }).should(
        'be.visible'
      )
    })

    it('should open "Connection History" page for the destination', () => {
      cy.get(historyElements.title).should('have.text', 'Connection History')
    })

    it('should have "Connection Info" component', () => {
      assert.exists(cy.get(historyElements.connectionInfo))
    })

    it('should have "IZ Gateway Hub Status History" component', () => {
      assert.exists(cy.get(historyElements.testHistory))
    })

    it('should have "Change History" component', () => {
      assert.exists(cy.get(historyElements.changeHistory))
    })
    after(() => {
      cy.logOut()
    })
  })
})

describe('As a user, on connection history page', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.loginByOkta(Cypress.env('auth_username'), Cypress.env('auth_password'))
    cy.visit(`/history/${destId}/${destination}`)
    cy.get(historyElements.connectionInfo, { timeout: 10000 }).should(
      'be.visible'
    )
  })
  describe('when "Close" button is clicked', () => {
    it('should navigate back to manage connections page', () => {
      cy.get(historyElements.close).click()
      cy.get(historyElements.manageTitle).should('have.text', 'My Connections')
    })
  })
  describe('when "eye" icon is clicked on connection Info component', () => {
    it('should have details of connection', () => {
      cy.get('#detail').click()
      assert.exists(cy.get('#detailDrawer'))
      cy.get('#title').should('have.text', 'Connection Info')
      assert.exists(cy.get(historyElements.organization))
      assert.exists(cy.get(historyElements.type))
      assert.exists(cy.get(historyElements.url))
      assert.exists(cy.get(historyElements.username))
      assert.exists(cy.get(historyElements.facilityId))
      assert.exists(cy.get(historyElements.msh3))
      assert.exists(cy.get(historyElements.msh4))
      assert.exists(cy.get(historyElements.msh5))
      assert.exists(cy.get(historyElements.msh6))
      assert.exists(cy.get(historyElements.msh22))
      assert.exists(cy.get(historyElements.rxa11))
      cy.get('#closeDetail').click()
    })
  })
  afterEach(() => {
    cy.logOut()
  })
})
