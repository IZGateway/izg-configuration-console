import * as React from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import ErrorIcon from "@mui/icons-material/Error";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ReactToPrint from "react-to-print";
import PrintIcon from "@mui/icons-material/Print";
import { useRef } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Container,
  Box,
  ButtonGroup,
  Typography,
  Divider,
  Button,
  LinearProgress,
  List,
  ListItemIcon,
  ListItemText,
  ListItem,
  Chip,
} from "@mui/material";

interface testListProps {
  testResults: any[];
  destination: string;
  destinationType: string;
  jurisdictionUrl: string;
}

const testsList = ({
  testResults,
  destination,
  destinationType,
  jurisdictionUrl,
}: testListProps) => {
  const handleReload = () => window.location.reload();
  const componentRef = useRef(null);
  const passeddata = testResults.filter(
    (item) => item.status === "PASS"
  ).length;
  const totaldata = testResults.length;
  const progressPct = Number(((passeddata / totaldata) * 100).toFixed());

  const list = () => (
    <>
      <List>
        {testResults.map((item, index) => (
          <>
            <ListItem key={item.name} id={item.name}>
              <ListItemIcon>
                {item.status === "PASS" && <CheckCircleIcon color="primary" />}
                {item.status === "FAIL" && <ErrorIcon color="secondary" />}
                {item.status === "WARNING" && (
                  <ReportProblemIcon color="warning" />
                )}
                {item.status === "SKIPPED" && (
                  <ErrorOutlineIcon sx={{ color: "#424242" }} />
                )}
              </ListItemIcon>

              {item.status === "PASS" ? (
                <ListItemText primary={item.name} />
              ) : item.status === "SKIPPED" ? (
                <ListItemText
                  primary={item.name}
                  secondary={
                    <Typography variant="body2" color="default">
                      Cannot test Further on failure
                    </Typography>
                  }
                />
              ) : (
                <ListItemText
                  primary={item.name}
                  secondary={
                    <Typography variant="body2" color="secondary">
                      {item.message}
                    </Typography>
                  }
                />
              )}
              <Chip
                label={item.status === "SKIPPED" ? "N/A" : item.status}
                variant="outlined"
                color={
                  item.status === "PASS"
                    ? "primary"
                    : item.status === "SKIPPED"
                    ? "default"
                    : "secondary"
                }
                sx={{
                  borderRadius: "4px",
                  marginTop: "8px",
                }}
              />
            </ListItem>
            <Divider />
          </>
        ))}
      </List>
    </>
  );

  const buttonGroup = () => (
    <Container
      maxWidth="sm"
      sx={{
        marginTop: 4,
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
          id="rerun"
          color="primary"
          variant="outlined"
          onClick={handleReload}
          sx={{
            borderRadius: "30px",
          }}
        >
          RERUN TEST
        </Button>
        <ReactToPrint
          trigger={() => (
            <Button
              id="print"
              variant="contained"
              color="primary"
              endIcon={<PrintIcon />}
              sx={{
                borderRadius: "30px",
              }}
            >
              PRINT
            </Button>
          )}
          content={() => componentRef.current}
        />
      </ButtonGroup>
    </Container>
  );

  return (
    <Box sx={{ position: "relative" }}>
      <div>
        <Container ref={componentRef}>
          <Box sx={{ marginTop: 8 }}>
            <Typography
              gutterBottom
              align="center"
              variant="h1"
              fontWeight={700}
              fontSize="32px"
              id="test-connection"
            >
              Connection testing for{" "}
              {destination === "unknown" ? "N/A" : destination}{" "}
              {destinationType}
            </Typography>
            <Typography align="center" variant="body1">
              Test results for the URL <strong>{jurisdictionUrl}</strong> are
              displayed below. For any tests that fail, please make required
              changes to the connection and then retry testing.
            </Typography>
          </Box>
          <Card
            sx={{ marginTop: 4, borderRadius: "0px 0px 16px 16px" }}
            id="test-connection-info"
          >
            <CardHeader title="Test your connection" />
            <Divider />
            <CardContent>
              <Typography variant="body1">
                <Box
                  component="span"
                  fontWeight="fontWeightMedium"
                  id="progress-bar"
                >
                  {progressPct}% Passed
                </Box>
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progressPct}
                sx={{
                  marginTop: 1,
                  marginBottom: 1,
                  height: 8,
                  borderRadius: "8px",
                }}
              />
              <Typography variant="body1">
                {passeddata} out of {totaldata} Test Passed
              </Typography>
              {list()}
            </CardContent>
          </Card>
        </Container>
        {buttonGroup()}
      </div>
    </Box>
  );
};

export default testsList;
