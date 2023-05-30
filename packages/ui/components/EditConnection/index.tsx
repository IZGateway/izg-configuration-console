import * as React from "react";
import {
  Container,
  Typography,
  Stepper,
  Box,
  Step,
  ButtonGroup,
  Button,
  StepLabel,
} from "@mui/material";
import StepConnector, {
  stepConnectorClasses,
} from "@mui/material/StepConnector";
import { styled } from "@mui/material/styles";
import SubmitModal from "./submitModal";
import { gql, useMutation, useQuery } from "@apollo/client";
import { FETCH_DESTINATION } from "../../lib/queries/fetch";
import ServiceAgreement from "./serviceAgreement";
import Identify from "./identify";
import Verify from "./verify";
import Jurisdiction from "./jurisdiction";

// interface editConnectionProps { }

// export const ADD_CONNECTION = gql`
//   mutation AddConnection($uri: String) {
//     addConnection(uri: $uri) {
//       success
//     }
//   }
// `;

const steps = ["SERVICE AGREEMENT", "JURISDICTION", "IDENTIFY", "VERIFY"];

const EditConnection = (props: any) => {
  const { loading, error, data } = useQuery(FETCH_DESTINATION, {
    variables: { destId: props.destId },
  });
  const [activeStep, setActiveStep] = React.useState(0);
  const [agreed, setAgreed] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);
  if (loading) return null;
  if (error) {
    throw new Error(error.message);
  }
  const handleIAgreeButton = () => {
    setAgreed(true);
  };
  // const mutateFunction = useMutation(ADD_CONNECTION);

  const handleAccept = () => {   ///DO WE REALLY NEED THIS METHOD???????????
    setAccepted(true)
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setAgreed(false)
  };

  const StepperLine = styled(StepConnector)(() => ({
    [`&.${stepConnectorClasses.alternativeLabel}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        borderColor: "#EEEEEE",
      },
      top: 18,
      left: "calc(-50% + 18px)",
      right: "calc(50% + 18px)",
    },
    [`&.${stepConnectorClasses.active}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        borderColor: "#00D998",
      },
    },
    [`&.${stepConnectorClasses.completed}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        borderColor: "#00D998",
      },
    },
    [`& .${stepConnectorClasses.line}`]: {
      top: "18px",
      borderTopWidth: 2,
      borderRadius: 1,
    },
  }));

  const actionButtons = () => (
    <Box
      sx={{
        textAlign: "center",
      }}
    >
      <ButtonGroup
        variant="contained"
        fullWidth
        size="large"
        sx={{
          margin: "1em",
          alignItems: "center",
          borderRadius: "30px",
        }}
      >
        <Button
          id="previous"
          color="primary"
          variant="outlined"
          disabled={activeStep === 0}
          onClick={handleBack}
          sx={{
            borderRadius: "30px",
          }}
        >
          PREVIOUS
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button
            id="submit"
            type="submit"
            color="primary"
            variant="contained"
            // onClick={handleNext}
            // disabled={
            //   activeStep === 0
            //     ? !(jurisdictionFormik.dirty && jurisdictionFormik.isValid)
            //     : !(identifyFormik.dirty && identifyFormik.isValid)
            // }
            sx={{
              borderRadius: "30px",
            }}
          >
            SUBMIT
          </Button>
        ) : (
          <Button
            id="next"
            type="submit"
            color="primary"
            variant="contained"
            onClick={handleNext}
            // disabled={
            //   activeStep === 0
            //     ? !(jurisdictionFormik.dirty && jurisdictionFormik.isValid)
            //     : !(identifyFormik.dirty && identifyFormik.isValid)
            // }
            sx={{
              borderRadius: "30px",
            }}
          >
            NEXT
          </Button>
        )}
      </ButtonGroup>
    </Box>
  );

  const acceptButton = () => (
    <Box sx={{ textAlign: "center" }}>
      <Button
        id="accept"
        variant="contained"
        color="primary"
        size="large"
        onClick={handleAccept}
        disabled={!agreed}
        sx={{
          background: "secondary",
          borderRadius: "37.5px",
          margin: "1em",
          alignItems: "center",
          width: 350
        }}
      >
        ACCEPT
      </Button>
    </Box>
  )

  return (
    <Container maxWidth="sm">
      <div>
        <Box sx={{ marginTop: 4 }}>
          <Typography
            align="center"
            variant="h1"
            fontWeight={700}
            fontSize="32px"
            id="add-connecton"
          >
            Editing {data.destinationById.jurisdiction.description} {data.destinationById.dest_type.type}
          </Typography>
          <Typography gutterBottom align="center" variant="body1">
            Use the stepper to edit & manage sections of your connection
          </Typography>
        </Box>
        <Box mt={4} mb={4}>
          <Stepper
            activeStep={activeStep}
            alternativeLabel
            connector={<StepperLine />}
          >
            {steps.map((label, index) => {
              const stepProps: { completed?: boolean } = {};
              const labelProps: {
                optional?: React.ReactNode;
              } = {};

              return (
                <Step key={label} {...stepProps}>
                  <StepLabel {...labelProps}>{label}</StepLabel>
                </Step>
              );
            })}
          </Stepper>
        </Box>

        {activeStep === 0 && <ServiceAgreement clickOnAgree={handleIAgreeButton} />}
        {activeStep === 1 && <Jurisdiction {...data} />}
        {activeStep === 2 && <Identify {...data} />}
        {activeStep === 3 && <Verify />}
        <Container
          maxWidth="sm"
          sx={{
            marginTop: 4,
          }}
        >
          {activeStep === 0 ? acceptButton() : actionButtons()}

        </Container>


      </div>
    </Container>
  );
};

export default EditConnection;
