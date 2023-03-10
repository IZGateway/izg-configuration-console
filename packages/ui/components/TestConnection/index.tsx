import * as React from "react";
import TestSkeleton from "../../components/Skeleton";
import { useState, useEffect } from "react";
import Close from "../Close";
import { Box, Container } from "@mui/material";
import TestsList from "./testsList";
import { useRouter } from "next/router";

const TestConnection = () => {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tests, setTests] = useState([]);
  const [jurisdiction, setJurisdiction] = useState("");
  const [type, setType] = useState("");
  const [jurisdictionUrl, setJurisdictionUrl] = useState("");
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (!router.isReady) return;
    setError(null);
    setLoading(true);

    fetch(`/api/tests/connectiontest/${id}`)
      .then((res) => {
        if (!res.ok) {
          setError(res.statusText);
        }
        return res.json();
      })
      .then((data) => {
        setType(data.destType);
        setTests(data.testResults);
        setJurisdiction(data.jurisdictionDescription);
        setJurisdictionUrl(data.destUrl);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, [id, router.isReady]);

  if (error) {
    setLoading(false);
    throw new Error(error);
  }

  return (
    <Box sx={{ position: "relative" }}>
      <div>
        <Close />
        <Container maxWidth="md">
          {isLoading ? (
            <TestSkeleton />
          ) : (
            <TestsList
              testResults={tests}
              destination={jurisdiction}
              destinationType={type}
              jurisdictionUrl={jurisdictionUrl}
            />
          )}
        </Container>
      </div>
    </Box>
  );
};

export default TestConnection;
