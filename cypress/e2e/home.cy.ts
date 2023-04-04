const homeElements={
  appHeader: '#app-header',
  navigation: '[id="navigation"]',
  userProfile: '[id="User Profile"]',
  manageConnection: '[id="Manage Connections"]',
  addConnection: '[id="Add Connection"]'
}

describe('As a user, on Home page', () => {

  beforeEach (() => {
    cy.visit('http://localhost:3000/');
  })

    // it('should see app header bar', () => {
    //   assert.exists(cy.get(homeElements.appHeader))
    // })

    it('should see navigation side menu', () => {
      assert.exists(cy.get(homeElements.navigation))
    })
    
    // describe('when clicking on user profile button', () => {

    //   it('should navigate user to user profile page', () => {
    //     cy.get(homeElements.userProfile).click();
    //     cy.url().should('contain','/user');
    //   })
    // })

    describe('when clicking on manage connections button', () => {

      it('should navigate user to manage connections page', () => {
        cy.get(homeElements.manageConnection).click();
        cy.url().should('contain','/manage');
      })
    })

    // describe('when clicking on add connection button', () => {

    //   it('should navigate user to add connection page', () => {
    //     cy.get(homeElements.addConnection).click();
    //     cy.url().should('contain','/add');
    //   })
    // })
})