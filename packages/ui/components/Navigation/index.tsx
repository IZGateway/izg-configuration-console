import * as React from "react";
import NextLink from "next/link";
import IZGLogo from "./Branding";
import MuiDrawer from "@mui/material/Drawer";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { signOut } from "next-auth/react";
import {
  Collapse,
  styled,
  List,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button
} from "@mui/material";
import { menuItems } from "./menuItems";

const drawerWidthOpen = "20em";
const drawerWidthClosed = "5em";

const closedMixin = () => ({
  width: drawerWidthClosed,
  overflowX: "hidden",
  background: "#1E4D3B",
  color: "#FFFFFF",
  boxShadow: "5px 0px 10px rgb(0 0 0 / 30%)",
});

const openMixin = () => ({
  width: drawerWidthOpen,
  overflowX: "hidden",
  background: "#1E4D3B",
  color: "#FFFFFF",
  boxShadow: "5px 0px 10px rgb(0 0 0 / 30%)",
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(2),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ open }) => ({
  width: drawerWidthOpen,
  flexShrink: 1,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  padding: 2,

  ...(open && { "& .MuiDrawer-paper": openMixin() }),
  ...(!open && {
    width: drawerWidthClosed,
    "& .MuiDrawer-paper": closedMixin(),
  }),
}));

export type MenuItem = {
  label: string;
  icon: any;
  path: string;
};

// export interface MenuItems extends Array<MenuItem> {
//   items: MenuItem[];
// }

const MiniDrawer = () => {
  const [open, setOpen] = React.useState(true);
  const [selectedIndex, setSelectedIndex] = React.useState(1);


  const handleClick = () => {
    setOpen(!open);
  };

  const handleListItemClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    index: number
  ) => {
    setSelectedIndex(index);
  };

  
  const handleSignOut = async() => {
    await signOut({callbackUrl: `/api/auth/logout`});
  }

  const list = () => (
    <>
      <List
        sx={{
          padding: "0 0",
          "&& .Mui-selected , && .Mui-selected:hover": {
            backgroundColor: "white",
            "&, & .MuiListItemIcon-root": {
              color: "#015A2F",
            },
            "&, & .MuiListItemText-root": {
              color: "black",
            },
            "span.MuiTypography-root.MuiTypography-body1.MuiListItemText-primary.css-8dlta7-MuiTypography-root":
              {
                fontWeight: 700,
              },
          },
          "& .MuiListItemButton-root:hover": {
            bgcolor: "rgb(255 255 255 / 10%)",
            "&, & .MuiListItemIcon-root": {
              color: "white",
            },
          },
        }}
      >
        {menuItems.map((item: MenuItem, index) => (
          <NextLink key={item.label} href={item.path} passHref>
            <ListItem
              key={item.label}
              sx={{
                padding: "0 0",
              }}
            >
              <ListItemButton
                sx={{
                  padding: "1rem 1.5rem",
                  borderBottom: "1px solid #00D998",
                  "&& .Mui-selected , && .Mui-selected:hover": {
                    fontWeight: "700",
                  },
                }}
                key={item.label}
                selected={selectedIndex === index}
                onClick={(event) => handleListItemClick(event, index)}
                id={item.label}
              >
                <ListItemIcon
                  sx={{
                    color: "white",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
              <Divider color="#00D998" />
            </ListItem>
          </NextLink>
        ))}
      </List>
    </>
  );

  return (
    <Drawer variant="permanent" open={open} id="navigation">
      <DrawerHeader>
        <IconButton onClick={handleClick}>
          {!open ? (
            <ChevronRightIcon fontSize="large" sx={{ color: "#FFFFFF" }} />
          ) : (
            <ChevronLeftIcon fontSize="large" sx={{ color: "#FFFFFF" }} />
          )}
        </IconButton>
      </DrawerHeader>
      <div>
        <IZGLogo />
      </div>
      <Divider color="#00D998" />
      {list()}
      <Button
        variant="text"
        onClick={handleSignOut}
        sx={{
          color: "#FFFFFF" ,
          textDecoration: "underline",
          position: "absolute",
          left: "10px",
          bottom: "20px",
          textTransform: "capitalize"
        }}
      >
        Log Out
      </Button>
      <Collapse in={!open} timeout="auto" />
      {/* Commenting this code as it is not part of any user story right now */}
      {/* <Button
        variant="contained"
        size="large"
        sx={{
          background: "#00D998",
          borderRadius: "37.5px",
          margin: "1em",
          //marginTop:"700px", TODO fix this with a better positioning option
          alignItems: "center",
          }}
      >
        Need Help?
      </Button> */}
    </Drawer>
  );
};

export default MiniDrawer;
