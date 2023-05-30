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
import { useFormik } from "formik";
import * as yup from "yup";
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const validationSchemaIdentify = yup.object().shape({
  username: yup.string().required("Required"),
  password: yup.string().required("Required"),
  url: yup.string().required("Required"),
  facilityId: yup.string().required("Required"),
  MSH4: yup.string().required("Required"),
  MSH6: yup.string().required("Required"),
});

const Identify = (props: any) => {


  // const identifyFormik = useFormik({
  //   initialValues: {
  //     username: "",
  //     password: "",
  //     url: "",
  //     facilityId: "",
  //     MSH4: "",
  //     MSH5: "",
  //     MSH6: "",
  //     MSH3: "",
  //     MSH22: "",
  //     RXA11: "",
  //   },
  //   validationSchema: validationSchemaIdentify,
  //   onSubmit: (values) => {
  //     console.log(values);
  //     identifyFormik.setSubmitting(false);
  //   },
  // });


  return (
    <div>
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
              label="Username"
              variant="outlined"
              fullWidth
              disabled
              defaultValue={props.destinationById.username}
              InputProps={{
                readOnly: true,
              }}
              sx={{ marginTop: 1 }}
            />
            <Typography
              fontSize={"12px"}
              sx={{ marginLeft: 2 }}
            >
              Username must contain one uppercase letter, at least 8 characters and one number
            </Typography>
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
          </Box>
        </CardContent>
        <Button
          color="primary"
          variant="contained"
          size="large"
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
                id="facilityID"
                label="Facility ID"
                variant="outlined"
                disabled
                defaultValue={props.destinationById.facility_id}
                InputProps={{
                  readOnly: true,
                  endAdornment: <InputAdornment position="start"><InfoOutlinedIcon /></InputAdornment>,
                }} />
              <TextField
                id="msh4"
                label="MSH-4"
                variant="outlined"
                disabled
                defaultValue={props.destinationById.msh4}
                InputProps={{
                  readOnly: true,
                  endAdornment: <InputAdornment position="start"><InfoOutlinedIcon /></InputAdornment>,
                }} />
              <TextField
                id="msh6"
                label="MSH-6"
                variant="outlined"
                disabled
                defaultValue={props.destinationById.msh6}
                InputProps={{
                  readOnly: true,
                  endAdornment: <InputAdornment position="start"><InfoOutlinedIcon /></InputAdornment>,
                }} />
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <TextField
                id="msh3"
                label="MSH-3"
                variant="outlined"
                disabled
                defaultValue={props.destinationById.msh3}
                InputProps={{
                  readOnly: true,
                  endAdornment: <InputAdornment position="start"><InfoOutlinedIcon /></InputAdornment>,
                }} />

              <TextField
                id="msh5"
                label="MSH-5"
                variant="outlined"
                disabled
                defaultValue={props.destinationById.msh5}
                InputProps={{
                  readOnly: true,
                  endAdornment: <InputAdornment position="start"><InfoOutlinedIcon /></InputAdornment>,
                }} />

              <TextField
                id="msh22"
                label="MSH-22"
                variant="outlined"
                disabled
                defaultValue={props.destinationById.msh22}
                InputProps={{
                  readOnly: true,
                  endAdornment: <InputAdornment position="start"><InfoOutlinedIcon /></InputAdornment>,
                }} />
            </Box>
          </Box>
          <Box sx={{ marginTop: "1rem" }}>
            <TextField
              id="rxa11"
              label="RXA-11"
              variant="outlined"
              disabled
              fullWidth
              defaultValue={props.destinationById.rxa11}
              InputProps={{
                readOnly: true,
                endAdornment: <InputAdornment position="start"><InfoOutlinedIcon /></InputAdornment>,
              }}
            />
          </Box>


        </CardContent>
      </Card>
      {/* <Typography variant="h2">Confirm Credentials</Typography>
          <Divider />
          <TextField
            required
            variant="outlined"
            id="url"
            name="url"
            label="Endpoint URL"
            sx={{ marginTop: 5 }}
            value={identifyFormik.values.url}
            onChange={identifyFormik.handleChange}
            helperText={identifyFormik.touched.url && identifyFormik.errors.url}
            error={
              identifyFormik.touched.url && Boolean(identifyFormik.errors.url)
            }
          />
          <TextField
            required
            variant="outlined"
            id="username"
            name="username"
            label="Username"
            sx={{ marginTop: 5 }}
            value={identifyFormik.values.username}
            onChange={identifyFormik.handleChange}
            helperText={
              identifyFormik.touched.username && identifyFormik.errors.username
            }
            error={
              identifyFormik.touched.username &&
              Boolean(identifyFormik.errors.username)
            }
          />
          <TextField
            required
            variant="outlined"
            id="password"
            name="password"
            label="Password"
            sx={{ marginTop: 5 }}
            value={identifyFormik.values.password}
            onChange={identifyFormik.handleChange}
            helperText={
              identifyFormik.touched.password && identifyFormik.errors.password
            }
            error={
              identifyFormik.touched.password &&
              Boolean(identifyFormik.errors.password)
            }
          />
          <Divider sx={{ marginTop: 2 }} />
          <Box sx={{ display: "flex", gap: "2rem" }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              <TextField
                required
                id="facilityId"
                name="facilityId"
                variant="outlined"
                label="Facility ID"
                sx={{ marginTop: 5 }}
                value={identifyFormik.values.facilityId}
                onChange={identifyFormik.handleChange}
                helperText={
                  identifyFormik.touched.facilityId &&
                  identifyFormik.errors.facilityId
                }
                error={
                  identifyFormik.touched.facilityId &&
                  Boolean(identifyFormik.errors.facilityId)
                }
              />
              <TextField
                variant="outlined"
                id="MSH3"
                name="MSH3"
                label="MSH-3"
                value={identifyFormik.values.MSH3}
                onChange={identifyFormik.handleChange}
                sx={{ marginTop: 5 }}
                helperText={
                  identifyFormik.touched.MSH3 && identifyFormik.errors.MSH3
                }
                error={
                  identifyFormik.touched.MSH3 &&
                  Boolean(identifyFormik.errors.MSH3)
                }
              />
              <TextField
                required
                variant="outlined"
                id="MSH4"
                name="MSH4"
                label="MSH-4"
                sx={{ marginTop: 5 }}
                value={identifyFormik.values.MSH4}
                onChange={identifyFormik.handleChange}
                helperText={
                  identifyFormik.touched.MSH4 && identifyFormik.errors.MSH4
                }
                error={
                  identifyFormik.touched.MSH4 &&
                  Boolean(identifyFormik.errors.MSH4)
                }
              />
              <TextField
                id="MSH-5"
                variant="outlined"
                label="MSH-5"
                value={identifyFormik.values.MSH5}
                onChange={identifyFormik.handleChange}
                sx={{ marginTop: 5 }}
                helperText={
                  identifyFormik.touched.MSH5 && identifyFormik.errors.MSH5
                }
                error={
                  identifyFormik.touched.MSH5 &&
                  Boolean(identifyFormik.errors.MSH5)
                }
              />
              <TextField
                required
                variant="outlined"
                id="MSH6"
                name="MSH6"
                label="MSH-6"
                sx={{ marginTop: 5 }}
                value={identifyFormik.values.MSH6}
                onChange={identifyFormik.handleChange}
                helperText={
                  identifyFormik.touched.MSH6 && identifyFormik.errors.MSH6
                }
                error={
                  identifyFormik.touched.MSH6 &&
                  Boolean(identifyFormik.errors.MSH6)
                }
              />
              <TextField
                id="MSH-22"
                variant="outlined"
                label="MSH-22"
                value={identifyFormik.values.MSH22}
                onChange={identifyFormik.handleChange}
                sx={{ marginTop: 5 }}
              />
              <TextField
                id="RXA-11"
                variant="outlined"
                label="RXA-11"
                value={identifyFormik.values.RXA11}
                onChange={identifyFormik.handleChange}
                sx={{ marginTop: 5 }}
              />
            </Box>
          </Box> */}
    </div>
  );
};

export default Identify;