import * as React from "react";
import ConnectionsTable from "../../components/ConnectionTable";
import ErrorBoundary from "../../components/ErrorBoundary";
import Container from "../../components/Container";

const Manage = () => {
  return (
    <Container title="Manage Connections">
      <ErrorBoundary>
        <ConnectionsTable />
      </ErrorBoundary>
    </Container>
  );
};

export default Manage;
