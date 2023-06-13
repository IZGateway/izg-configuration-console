import * as React from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Divider,
  TextField,
  Button,
  Typography,
  Box,
  InputAdornment
} from "@mui/material";
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';


const Identify = (props: any) => {
  const [click, setClick] = React.useState(false)

  const handleChange = (event) => {
    event.preventDefault();
    if (event.target.name === "newPassword" || event.target.name === "confirmPassword") {
      props.setValue({ ...props.value, "password": event.target.value });
    } else {
      props.setValue({ ...props.value, [event.target.name]: event.target.value });
    }
  };

  const updatePassword = () => {
    setClick(true)
  }

  const newPassword = () => {
    return (
      <div>
        <TextField
          id="current-password"
          label="Current Password"
          variant="outlined"
          fullWidth
          disabled
          defaultValue={props.destinationById.password}
          InputProps={{
            readOnly: true,
          }}
          sx={{ marginTop: 1 }}
        />
        <TextField
          id="new-password"
          name="newPassword"
          label="New Password"
          variant="outlined"
          fullWidth
          value={props.value.newPassword}
          onChange={handleChange}
          sx={{ marginTop: 1 }}
        />
        <Typography
          fontSize={"12px"}
          sx={{ marginLeft: 2 }}
        >
          Passwords must have a length of 15 characters.  Passwords must include at least 2 of each the following: Numbers (0 through 9), Lowercase letters (a through z), Uppercase letters (A through Z), and Special Characters (!@#$%^()&)
        </Typography>
        <TextField
          id="confirm-new-password"
          name="confirmPassword"
          label="Confirm New Password"
          variant="outlined"
          fullWidth
          value={props.value.confirmPassword}
          onChange={handleChange}
          sx={{ marginTop: 1 }}
        />
      </div>
    )
  }

  return (
    <form>
      <Card sx={{ minWidth: 275, borderRadius: "0px 0px 30px 30px" }}>
        <CardHeader title="Configure Credentials" />
        <Divider />
        <CardContent>
          <div>
            When editing connection credentials, it is important to exercise caution. Failure to do so can result in unauthorized access to sensitive information, which can be detrimental to individuals or organizations
          </div>
          <Box >
            <TextField
              id="endpointURL"
              label="Endpoint URL"
              variant="filled"
              fullWidth
              disabled
              defaultValue={props.destinationById.dest_uri}
              InputProps={{
                readOnly: true,
                endAdornment: <InputAdornment position="start"><InfoOutlinedIcon /></InputAdornment>,
              }}
              sx={{ marginTop: 1 }}
            />
            <TextField
              id="username"
              name="username"
              label="Username"
              variant="outlined"
              fullWidth
              value={props.value.username}
              onChange={handleChange}
              sx={{ marginTop: 1 }}
            />
            <Typography
              fontSize={"12px"}
              sx={{ marginLeft: 2 }}
            >
              Username must contain one uppercase letter, at least 8 characters and one number
            </Typography>
            {click ? newPassword() :
              <div>
                <TextField
                  id="password"
                  label="Password"
                  variant="outlined"
                  fullWidth
                  disabled
                  defaultValue={props.destinationById.password}
                  InputProps={{
                    readOnly: true,
                  }}
                  sx={{ marginTop: 1 }}
                />
                <Typography
                  fontSize={"12px"}
                  sx={{ marginLeft: 2 }}
                >
                  Password must contain one uppercase letter, at least 8 characters  and one number. To change password click on the change password button below.
                </Typography>
              </div>
            }
          </Box>
        </CardContent>
        {!click &&
          <Button
            color="primary"
            variant="outlined"
            size="large"
            onClick={updatePassword}
            sx={{
              margin: "1em",
              alignItems: "center",
              borderRadius: "30px",
              marginTop: 0.5
            }}
          >
            CHANGE PASSWORD
            <ModeEditIcon fontSize="small" sx={{ marginLeft: 1 }} />
          </Button>
        }
      </Card>
      <Card sx={{ minWidth: 275, borderRadius: "0px 0px 30px 30px", marginTop: 5 }}>
        <CardHeader title="View Additional Data Configurations" />
        <Divider />
        <CardContent>
          <div>
            All MSH and facility ID values should be alpha number, typically uppercase, but may contain some special characters such as _ (underscore) and - (hyphen). If you think a value is incorrect, please contact your administrator
          </div>
          <Box sx={{ display: "flex", gap: "2rem", marginTop: 2 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <TextField
                id="facilityId"
                name="facility_id"
                label="Facility ID"
                variant="outlined"
                value={props.value.facility_id}
                onChange={handleChange}
                InputProps={{
                  endAdornment: <InputAdornment position="start"><InfoOutlinedIcon /></InputAdornment>,
                }} />
              <TextField
                id="msh4"
                name="MSH4"
                label="MSH-4"
                variant="outlined"
                value={props.value.MSH4}
                onChange={handleChange}
                InputProps={{
                  endAdornment: <InputAdornment position="start"><InfoOutlinedIcon /></InputAdornment>,
                }} />
              <TextField
                id="msh6"
                name="MSH6"
                label="MSH-6"
                variant="outlined"
                value={props.value.MSH6}
                onChange={handleChange}
                InputProps={{
                  endAdornment: <InputAdornment position="start"><InfoOutlinedIcon /></InputAdornment>,
                }} />
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <TextField
                id="msh3"
                name="MSH3"
                label="MSH-3"
                variant="outlined"
                value={props.value.MSH3}
                onChange={handleChange}
                InputProps={{
                  endAdornment: <InputAdornment position="start"><InfoOutlinedIcon /></InputAdornment>,
                }} />

              <TextField
                id="msh5"
                name="MSH5"
                label="MSH-5"
                variant="outlined"
                value={props.value.MSH5}
                onChange={handleChange}
                InputProps={{
                  endAdornment: <InputAdornment position="start"><InfoOutlinedIcon /></InputAdornment>,
                }} />

              <TextField
                id="msh22"
                name="MSH22"
                label="MSH-22"
                variant="outlined"
                value={props.value.MSH22}
                onChange={handleChange}
                InputProps={{
                  endAdornment: <InputAdornment position="start"><InfoOutlinedIcon /></InputAdornment>,
                }} />
            </Box>
          </Box>
          <Box sx={{ marginTop: "1rem" }}>
            <TextField
              id="rxa11"
              name="RXA11"
              label="RXA-11"
              variant="outlined"
              fullWidth
              value={props.value.RXA11}
              onChange={handleChange}
              InputProps={{
                endAdornment: <InputAdornment position="start"><InfoOutlinedIcon /></InputAdornment>,
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </form>
  );
};

export default Identify;