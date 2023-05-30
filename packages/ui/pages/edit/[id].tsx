import * as React from "react";
import EditConnection from "../../components/EditConnection/index";
import Policy from "../../components/EditConnection/serviceAgreement";
import Container from "../../components/Container";
import { Box } from "@mui/material";
import ErrorBoundary from "../../components/ErrorBoundary";
import Close from "../../components/Close";
import { useRouter } from "next/router";

const Edit = () => {
  const router = useRouter();
  const [agreed, setAgreed] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);

  const handleClick = () => {
    agreed && setAccepted(true);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAgreed(true);
  };

  return (
    <Container title="Edit Connection">
      <ErrorBoundary>
        <Box sx={{ position: "relative" }}>
          <div>
            <Close />
            <EditConnection destId={router.query?.id as string} />
          </div>
        </Box>
      </ErrorBoundary>
    </Container>
  );
};

export default Edit;
