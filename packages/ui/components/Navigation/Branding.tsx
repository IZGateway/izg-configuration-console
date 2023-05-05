import * as React from "react";
import Image from "next/image";
import izgLogo from "/public/IZ_Gateway_Logo 1.png";
import { CardContent, Typography, Avatar, Card, Box } from "@mui/material";
export interface IIZGLogoProps {}

const IZGLogo = (props: IIZGLogoProps) => {
  return (
    <Card
      sx={{
        display: "flex",
        boxShadow: 0,
        background: "#1E4D3B",
        color: "white",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", pl: 2 }}>
        <Avatar alt="IZ Gateway Logo" sx={{ width: 50, height: 50 }}>
          <Image src={izgLogo} />
        </Avatar>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <CardContent sx={{ flex: "1 0 auto" }}>
          <Typography variant="h6" component="div">
            IZ Gateway
          </Typography>
          <Typography variant="caption" component="div">
            Fast, Efficient, Accurate Data Sharing
          </Typography>
        </CardContent>
      </Box>
    </Card>
  );
};

export default IZGLogo;
