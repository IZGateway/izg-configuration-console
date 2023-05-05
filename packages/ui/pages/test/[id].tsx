import * as React from "react";
import TestConnection from "../../components/TestConnection";
import ErrorBoundary from "../../components/ErrorBoundary";
import Container from "../../components/Container";

const Test = () => {
  return (
    <Container title="Test Connection">
      <ErrorBoundary>
        <TestConnection />
      </ErrorBoundary>
    </Container>
  );
};

export default Test;
