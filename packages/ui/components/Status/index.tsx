import React from "react";
import { Typography, Box } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

interface statusProps {
  status: {
    status: String;
  };
  color: Boolean;
}

const Status = (props: statusProps) => {
  const status = props.status === null ? "N/A" : props.status.status;
  if (props.color) {
    return (
      <Typography
        gutterBottom
        variant="body1"
        sx={{ color: "#757575" }}
        component="div"
      >
        {status === "N/A" || status !== "Connected" ? (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography component="div">Not Connected</Typography>
            <ErrorOutlineIcon fontSize="small" sx={{ marginLeft: 0.5 }} />
          </Box>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography component="div">Connected</Typography>
            <CheckIcon fontSize="small" sx={{ marginLeft: 0.5 }} />
          </Box>
        )}
      </Typography>
    );
  } else {
    return (
      <Typography gutterBottom variant="body1" component="div">
        {status === "N/A" || status !== "Connected" ? (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography>Not Connected</Typography>
            <ErrorOutlineIcon fontSize="small" sx={{ marginLeft: 0.5 }} />
          </Box>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography>Connected</Typography>
            <CheckIcon fontSize="small" sx={{ marginLeft: 0.5 }} />
          </Box>
        )}
      </Typography>
    );
  }
};

export default Status;
