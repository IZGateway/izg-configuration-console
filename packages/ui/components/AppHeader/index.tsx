import * as React from "react";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { Avatar, Typography, Toolbar, AppBar } from "@mui/material";
import Image from "next/image";
import userImage from "/public/userImage.png";

interface AppHeaderProps {
  loggedInUserName: string;
  open: boolean;
  display: (isOpened: boolean) => void;
}

const headerStyle = {
  display: "flex",
  background: "#00D998",
  color: "#212121",
  height: 84,
  boxShadow: "0px 0px 5px rgba(0, 0, 0, 0.25)",
  borderRadius: "0px 0px 30px 0px",
};

const AppHeaderBar = (props: AppHeaderProps) => {
  return (
    <AppBar sx={headerStyle} position={"sticky"}>
      <Toolbar id="app-header">
        <Avatar
          sx={{
            alt: "User Image",
            marginRight: "16px",
            marginLeft: 45,
          }}
        >
          <Image src={userImage} />
        </Avatar>
        <Typography
          flexGrow={1}
          fontWeight={"700"}
          fontSize={"16px"}
          display="flex"
          align="center"
          lineHeight={"18px"}
        >
          | Welcome {props.loggedInUserName} to IZ Gateway
        </Typography>
        <IconButton onClick={() => props.display(props.open)}>
          <CloseIcon sx={{ color: "#212121" }} />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

AppHeaderBar.defaultProps = {
  loggedInUserName: "IZ Gateway User",
};

export default AppHeaderBar;
