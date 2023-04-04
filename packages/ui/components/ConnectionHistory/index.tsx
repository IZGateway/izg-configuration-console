import * as React from "react";
import { Typography, Box, BoxProps } from "@mui/material";
import { useQuery } from "@apollo/client";
import { FETCH_DESTINATION } from "../../lib/queries/fetch";
import TestHistory from "./testHistory";
import ConnectionInfo from "./connectionInfo";
import Close from "../Close";

const ConnectionHistory = (props: any) => {
  const { loading, error, data } = useQuery(FETCH_DESTINATION, {
    variables: { destId: props.destId },
  });

  if (loading) return null;
  if (error) {
    throw new Error(error.message);
  }

  function Item(props: BoxProps) {
    const { sx, ...other } = props;
    return (
      <Box
        sx={{
          ...sx,
        }}
        {...other}
      />
    );
  }

  return (
    <div>
      <Close />
      <Box sx={{ marginTop: 4 }}>
        <Typography
          variant="h1"
          fontWeight={700}
          fontSize="32px"
          id="title-history"
        >
          Connection History
        </Typography>
        <Typography variant="body1">
          Find users, view the test history and view additional information.
        </Typography>
      </Box>
      <Box sx={{ display: "flex", gap: 4 }}>
        <Item sx={{ width: "40%" }}>
          <ConnectionInfo {...data} />
        </Item>
        <Item sx={{ flexGrow: 1 }}>
          <TestHistory destId={data.destinationById.dest_id} />
        </Item>
      </Box>
    </div>
  );
};

export default ConnectionHistory;
