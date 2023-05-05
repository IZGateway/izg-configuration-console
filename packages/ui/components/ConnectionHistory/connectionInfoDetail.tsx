import * as React from "react";
import {
  Box,
  Button,
  CardContent,
  Drawer,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

interface ConnectionDetailProps {
  data: any;
  open: boolean;
  display: (isOpen: boolean) => void;
}

const ConnectionInfoDetail = ({
  data,
  open,
  display,
}: ConnectionDetailProps) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  return (
    <div>
      <Drawer
        anchor={"right"}
        open={open}
        onClose={display}

        // PaperProps={{
        //   sx: { width: "30%" },
        // }}
      >
        <CardContent id="detailDrawer">
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="space-between"
            minHeight="96vh"
          >
            <Box>
              <Typography variant="h2" fontSize="28px" id="title">
                <strong>Connection Info</strong>
              </Typography>
              <Typography pt={2} pb={2} variant="body1">
                View connection information below. Editing is not available on
                this panel.
              </Typography>
              <Box
                display="flex"
                gap={2}
                flexDirection="column"
                justifyContent="space-between"
              >
                <Typography variant="body1">
                  <strong> Configuration Fields </strong>
                </Typography>
                <Box
                  display="flex"
                  gap={2}
                  flexDirection="column"
                  justifyContent="space-between"
                >
                  <TextField
                    id="jurisdiction"
                    label="Jurisdiction"
                    variant="filled"
                    disabled
                    defaultValue={data.jurisdiction.description}
                    InputProps={{
                      readOnly: true,
                    }}
                  />

                  <TextField
                    id="type"
                    label="Type of Connection"
                    variant="filled"
                    disabled
                    defaultValue={data.dest_type.type}
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                  <TextField
                    id="url"
                    label="Endpoint URL"
                    variant="filled"
                    disabled
                    defaultValue={data.dest_uri}
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                </Box>
                <Box
                  display="flex"
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={2}
                >
                  <TextField
                    id="username"
                    label="Username"
                    variant="filled"
                    disabled
                    defaultValue={data.username}
                    InputProps={{
                      readOnly: true,
                    }}
                    fullWidth
                  />

                  <TextField
                    id="facilityId"
                    label="Facility ID"
                    variant="filled"
                    disabled
                    defaultValue={data.facility_id}
                    InputProps={{
                      readOnly: true,
                    }}
                    fullWidth
                  />
                </Box>

                <Box
                  display="flex"
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={2}
                >
                  <TextField
                    id="msh3"
                    label="MSH-3"
                    variant="filled"
                    disabled
                    defaultValue={data.MSH3}
                    InputProps={{
                      readOnly: true,
                    }}
                    fullWidth
                  />

                  <TextField
                    id="msh4"
                    label="MSH-4"
                    variant="filled"
                    disabled
                    defaultValue={data.MSH4}
                    InputProps={{
                      readOnly: true,
                    }}
                    fullWidth
                  />
                </Box>

                <Box
                  display="flex"
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={2}
                >
                  <TextField
                    id="msh5"
                    label="MSH-5"
                    variant="filled"
                    disabled
                    defaultValue={data.MSH5}
                    InputProps={{
                      readOnly: true,
                    }}
                    fullWidth
                  />

                  <TextField
                    id="msh6"
                    label="MSH-6"
                    variant="filled"
                    disabled
                    defaultValue={data.MSH6}
                    InputProps={{
                      readOnly: true,
                    }}
                    fullWidth
                  />
                </Box>

                <Box
                  display="flex"
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={2}
                >
                  <TextField
                    id="msh22"
                    label="MSH-22"
                    variant="filled"
                    disabled
                    defaultValue={data.MSH22}
                    InputProps={{
                      readOnly: true,
                    }}
                    fullWidth
                  />

                  <TextField
                    id="rxa11"
                    label="RXA-11"
                    variant="filled"
                    disabled
                    defaultValue={data.RXA11}
                    InputProps={{
                      readOnly: true,
                    }}
                    fullWidth
                  />
                </Box>

                {/*     
       
        ** Below is a pre built password hider will be used on additional pages **

        <TextField
              id="password"
              label="Password"
              variant="filled"
              disabled
              defaultValue={data.password}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
              type={showPassword ? 'text' : 'password'}
            />
        */}
              </Box>
            </Box>
            <Box pt={4} textAlign="center">
              <Button
                id="closeDetail"
                color="primary"
                variant="outlined"
                fullWidth
                onClick={() => display(open)}
                sx={{
                  borderRadius: "30px",
                }}
              >
                CLOSE
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Drawer>
    </div>
  );
};

export default ConnectionInfoDetail;
// sx={{marginTop: 2, borderRadius: "30px", textTransform: 'none'}}
