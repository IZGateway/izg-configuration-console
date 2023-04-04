
import * as React from "react";
import { Box, Typography, Drawer, TextField, Button, InputAdornment, IconButton } from "@mui/material";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';


interface ConnectionDetailProps {
  data: any,
  open: boolean,
  display: (isOpen: boolean) => void
}

const ConnectionInfoDetail = ({ data, open, display }: ConnectionDetailProps) => {

  const [showPassword, setShowPassword] = React.useState(false);
  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
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
        <Typography variant="h2" sx={{ paddingLeft: 2, paddingTop: 2 }}>
          Connection Info
        </Typography>

        <Typography variant="body1" sx={{ paddingLeft: 2 }}>
          View connection information below. Editing is not available on this panel.
        </Typography>

        <Box
          sx={{
            paddingTop: 2,
            paddingBottom: 2,
            paddingleft: 2,
            '& .MuiTextField-root': { m: 2.5 },
          }}
        >
          <Typography variant="body1" sx={{ paddingLeft: 2, paddingTop: 1 }}>
            <strong> Configuration Fields </strong></Typography>
          <Box display="flex" flexDirection="column" justifyContent="space-between"
            alignItems="left" sx={{
              paddingTop: 1,
              '& .MuiTextField-root': { m: 1 },
            }} >
            <TextField
              id="jurisdiction"
              label="Jurisdiction"
              variant="outlined"
              disabled
              defaultValue={data.jurisdiction.description}
              InputProps={{
                readOnly: true,
              }}
            />

            <TextField
              id="type"
              label="Type of Connection"
              variant="outlined"
              disabled
              defaultValue={data.dest_type.type}
              InputProps={{
                readOnly: true,
              }}
            />
            <TextField
              id="url"
              label="Endpoint URL"
              variant="outlined"
              disabled
              defaultValue={data.dest_uri}
              InputProps={{
                readOnly: true,
              }}
            />
          </Box>
          <Box display="flex" flexDirection="row" justifyContent="space-between"
            alignItems="center" >

            <TextField
              id="username"
              label="Username"
              variant="outlined"
              disabled
              defaultValue={data.username}
              InputProps={{
                readOnly: true,
              }}
            />
            <TextField
              id="password"
              label="Password"
              variant="outlined"
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
          </Box>

          <Box display="flex" flexDirection="row" justifyContent="space-between"
            alignItems="center" >

            <TextField
              id="Facility ID"
              label="Facility ID"
              variant="outlined"
              disabled
              defaultValue={data.facility_id}
              InputProps={{
                readOnly: true,
              }}
            />

            <TextField
              id="MSH-3"
              label="MSH-3"
              variant="outlined"
              disabled
              defaultValue={data.MSH3}
              InputProps={{
                readOnly: true,
              }}
            />
          </Box>

          <Box display="flex" flexDirection="row" justifyContent="space-between"
            alignItems="center" >

            <TextField
              id="MSH-4"
              label="MSH-4"
              variant="outlined"
              disabled
              defaultValue={data.MSH4}
              InputProps={{
                readOnly: true,
              }}
            />

            <TextField
              id="MSH-5"
              label="MSH-5"
              variant="outlined"
              disabled
              defaultValue={data.MSH5}
              InputProps={{
                readOnly: true,
              }}
            />

          </Box>

          <Box display="flex" flexDirection="row" justifyContent="space-between"
            alignItems="center" >

            <TextField
              id="MSH-6"
              label="MSH-6"
              variant="outlined"
              disabled
              defaultValue={data.MSH6}
              InputProps={{
                readOnly: true,
              }}
            />
            <TextField
              id="MSH-22"
              label="MSH-22"
              variant="outlined"
              disabled
              defaultValue={data.MSH22}
              InputProps={{
                readOnly: true,
              }}
            />
          </Box>
          <Box display="flex" flexDirection="column" justifyContent="space-between"
            alignItems="left" >
            <TextField
              id="type"
              label="RXA-11"
              variant="outlined"
              disabled
              defaultValue={data.RXA11}
              InputProps={{
                readOnly: true,
              }}
            />
            {/* <Button
          color="primary"
          variant="outlined"
          onClick={()=> display(open)}
          sx={{
            borderRadius: "30px",
            width:'60em', 
          }}
        >
          CLOSE
        </Button>     */}
          </Box>
        </Box>
        <Box textAlign='center'>
          <Button
            color="primary"
            variant="outlined"
            onClick={() => display(open)}
            sx={{
              borderRadius: "30px",
              width: '30em',
            }}
          >
            CLOSE
          </Button>
        </Box>
      </Drawer>
    </div>

  )
}

export default ConnectionInfoDetail;
// sx={{marginTop: 2, borderRadius: "30px", textTransform: 'none'}}