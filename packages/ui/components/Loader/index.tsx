import * as React from "react";
import CircularProgress from "@mui/material/CircularProgress";

export interface LoaderProps {}

const Loader = (props: LoaderProps) => {
  return (
    <>
      <CircularProgress color="success" sx={{ position: "absolute" }} />
    </>
  );
};

export default Loader;
