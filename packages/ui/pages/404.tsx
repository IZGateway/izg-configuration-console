import { Box, Typography, Button, List, ListItem } from "@mui/material";
import pageNotFound from "../public/PageNotFound.png";
import Image from "next/image";
import { useRouter } from "next/router";

export interface ErrorProps {}

const PageNotFound = (props: ErrorProps) => {
  const router = useRouter();

  const refreshPage = () => {
    router.reload();
  };

  return (
    <Box justifyContent="center" paddingLeft={10} paddingTop={10}>
      <Typography
        variant="h1"
        display="flex"
        flexGrow={1}
        fontWeight={"700"}
        lineHeight={"auto"}
        sx={{
          width: {
            xs: "6em",
            sm: "8em",
            md: "8em",
            lg: "10em",
            xl: "12em",
          },
          fontSize: {
            xs: "2rem",
            sm: "3rem",
            md: "4rem",
            lg: "4rem",
            xl: "4rem",
          },
        }}
      >
        The page you were looking for does not exist.
      </Typography>
      <Typography
        paddingTop={2}
        variant="h2"
        flexGrow={1}
        display="flex"
        fontWeight={"400"}
        fontSize={"24px"}
        lineHeight={"28px"}
      >
        There might be mutiple reasons why this page is not found.
      </Typography>
      <List
        sx={{
          listStyleType: "disc",
          fontWeight: "400",
          fontSize: "14px",
          lineHeight: "16px",
          padding: 2,
        }}
      >
        <ListItem sx={{ display: "list-item" }}>
          Page has been deleted or never existed
        </ListItem>
        <ListItem sx={{ display: "list-item" }}>
          Moved to a new location
        </ListItem>
        <ListItem sx={{ display: "list-item" }}>
          Misspelling in the URL
        </ListItem>
      </List>
      <Button
        target="_blank"
        href="https://support.izgateway.org/plugins/servlet/desk/site/izg"
        variant="contained"
        color="primary"
        disableElevation
        sx={{
          marginRight: 2,
          marginTop: 2,
          width: "15em",
          borderRadius: "30px",
          textTransform: "none",
        }}
      >
        Need Help
      </Button>
      <Button
        variant="outlined"
        color="primary"
        sx={{
          marginTop: 2,
          width: "15em",
          borderRadius: "30px",
          textTransform: "none",
        }}
        onClick={refreshPage}
      >
        Reload
      </Button>
      <Box
        sx={{
          position: {
            md: "fixed",
          },
          marginTop: {
            xs: "2em",
            sm: "2em",
            md: "auto",
            lg: "auto",
            xl: "auto",
          },
          marginBottom: {
            xs: "-2em",
            sm: "-2em",
            md: "auto",
            lg: "auto",
            xl: "auto",
          },
          right: "0",
          bottom: "0",
        }}
      >
        <Image src={pageNotFound} width={600} height={500} />
      </Box>
    </Box>
  );
};

export default PageNotFound;
