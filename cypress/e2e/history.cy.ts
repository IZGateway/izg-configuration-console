const historyElements = {
  title: "#title-history",
  connectionInfo: "#connection-info",
  testHistory: "#test-history",
  close: "#close",
  manageTitle: "#title-table",
  closeDetail: "#closeDetail",
  detail: "#detail",
  jurisdiction: "#jurisdiction",
  type: "#type",
  url: "#url",
  username: "#username",
  facilityId: "#facilityId",
  msh3: "#msh3",
  msh4: "#msh4",
  msh5: "#msh5",
  msh6: "#msh6",
  msh22: "#msh22",
  rxa11: "#rxa11",
  drawer:"#detailDrawer"
};

const expectedResults= {
  jurisdiction: "Alaska",
  type: "TEST",
  url: "https://izgateway-dev-nlb-e9941b47428f1e12.elb.us-east-1.amazonaws.com:443/dev/IISService",
  username: "AK_IZ_GATEWAY_TEST_HL7",
  facilityId: "SIISCLIENT10704",
  msh3: "VacTrAK",
  msh4: "AKIIS",
  msh5: "AK",
  msh6: "VacTrAK",
  msh22: "AKIIS",
  rxa11: "SIIS10543",
}

describe("As a user, on manage connections page", () => {
  const destination = "ak";
  describe("when clicks on history button for alaska connection", () => {
    beforeEach(() => {
      cy.visit("http://localhost:3000/manage");
      cy.get(`[data-id="${destination}"]`).find("#history").click();
    });

    it('should open "Connection History" page for the destination', () => {
      cy.get(historyElements.title).should("have.text", "Connection History");
    });

    it("should open detail for the connection", () => {
      cy.get("#detail").click();
      assert.exists(cy.get("#detailDrawer"));
      cy.get("#title").should("have.text", "Connection Info");
    });

    it('should have "Connection Info" section', () => {
      assert.exists(cy.get(historyElements.connectionInfo));
    });

    it('should have "Test History" section', () => {
      assert.exists(cy.get(historyElements.testHistory));
    });

    it('should navigate back to manage connections page when "Close" button is clicked', () => {
      cy.get(historyElements.close).click();
      cy.get(historyElements.manageTitle).should("have.text", "My Connections");
    });
  });
  describe("As a user, on connection history page", () => {
    beforeEach(() => {
      cy.visit("http://localhost:3000/manage");
      cy.get(`[data-id="${destination}"]`).find("#history").click();
      cy.get(historyElements.detail).click();     
    });

    it("should have correct information about the connection", () => {
      cy.get(historyElements.jurisdiction).should("have.value", expectedResults.jurisdiction);
      cy.get(historyElements.type).should("have.value", expectedResults.type);
      cy.get(historyElements.url).should(
        "have.value",
        expectedResults.url
      );
      cy.get(historyElements.username).should("have.value", expectedResults.username);
      cy.get(historyElements.facilityId).should("have.value", expectedResults.facilityId);
      cy.get(historyElements.msh3).should("have.value", expectedResults.msh3);
      cy.get(historyElements.msh4).should("have.value", expectedResults.msh4);
      cy.get(historyElements.msh5).should("have.value", expectedResults.msh5);
      cy.get(historyElements.msh6).should("have.value", expectedResults.msh6);
      cy.get(historyElements.msh22).should("have.value", expectedResults.msh22);
      cy.get(historyElements.rxa11).should("have.value", expectedResults.rxa11);
    });

    it("should close detail for the connection and user should be back to connection history page", () => {
      cy.get(historyElements.closeDetail).scrollIntoView().click();
      cy.get(historyElements.drawer).should('not.exist');
      cy.get(historyElements.title).should("have.text", "Connection History");
    });
  });
});
