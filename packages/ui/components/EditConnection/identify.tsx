import * as React from 'react'
import {
  Card,
  CardHeader,
  CardContent,
  Divider,
  TextField,
  Button,
  Typography,
  Box,
  InputAdornment,
} from '@mui/material'
import ModeEditIcon from '@mui/icons-material/ModeEdit'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

const Identify = (props: any) => {
  const [isChangePasswordClicked, setIsChangePasswordClicked] =
    React.useState(false)

  const handleChange = (e) => {
    props.handleChange(e.target.name, e.target.value)
  }

  const updatePassword = () => {
    setIsChangePasswordClicked(true)
  }
  const InputProps = {
    endAdornment: (
      <InputAdornment position="start">
        <InfoOutlinedIcon />
      </InputAdornment>
    ),
  }
  const formFields = [
    {
      id: 'facilityId',
      name: 'facility_id',
      label: 'Facility ID',
      value: props.value.facility_id,
      group: 1,
    },
    {
      id: 'msh4',
      name: 'MSH4',
      label: 'MSH-4',
      value: props.value.MSH4,
      group: 1,
    },
    {
      id: 'msh6',
      name: 'MSH6',
      label: 'MSH-6',
      value: props.value.MSH6,
      group: 1,
    },
    {
      id: 'msh3',
      name: 'MSH3',
      label: 'MSH-3',
      value: props.value.MSH3,
      group: 2,
    },
    {
      id: 'msh5',
      name: 'MSH5',
      label: 'MSH-5',
      value: props.value.MSH5,
      group: 2,
    },
    {
      id: 'msh22',
      name: 'MSH22',
      label: 'MSH-22',
      value: props.value.MSH22,
      group: 2,
    },
    {
      id: 'rxa11',
      name: 'RXA11',
      label: 'RXA-11',
      value: props.value.RXA11,
      group: 3,
    },
    {
      id: 'new-password',
      name: 'newPassword',
      label: 'New Password',
      value: props.value.newPassword,
      group: 4,
    },
    {
      id: 'confirm-new-password',
      name: 'confirmPassword',
      label: 'Confirm New Password',
      value: props.value.confirmPassword,
      group: 4,
    },
  ]

  const newPasswordFields = () => {
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
        <Typography fontSize={'12px'} sx={{ marginLeft: 2, marginTop: 2 }}>
          Passwords must have a length of 15 characters. Passwords must include
          at least 2 of each the following: Numbers (0 through 9), Lowercase
          letters (a through z), Uppercase letters (A through Z), and Special
          Characters (!@#$%^()&)
        </Typography>
        {formFields
          .filter((field) => field.group === 4)
          .map((field) => (
            <TextField
              key={field.id}
              name={field.name}
              label={field.label}
              variant="outlined"
              fullWidth
              sx={{ marginTop: 2 }}
              value={field.value}
              onChange={handleChange}
              InputProps={InputProps}
              error={
                props.isNextButtonClicked && !!props.formErrors[field.name]
              }
              helperText={
                props.isNextButtonClicked && props.formErrors[field.name]
              }
            />
          ))}
      </div>
    )
  }
  return (
    <form>
      <Card sx={{ minWidth: 275, borderRadius: '0px 0px 30px 30px' }}>
        <CardHeader title="Configure Credentials" />
        <Divider />
        <CardContent>
          <div>
            When editing connection credentials, it is important to exercise
            caution. Failure to do so can result in unauthorized access to
            sensitive information, which can be detrimental to individuals or
            organizations
          </div>
          <Box>
            <TextField
              id="endpointURL"
              label="Endpoint URL"
              variant="filled"
              fullWidth
              disabled
              defaultValue={props.destinationById.dest_uri}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="start">
                    <InfoOutlinedIcon />
                  </InputAdornment>
                ),
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
              error={props.isNextButtonClicked && !!props.formErrors.username}
              helperText={
                props.isNextButtonClicked && props.formErrors.username
              }
              sx={{ marginTop: 1 }}
            />
            <Typography fontSize={'12px'} sx={{ marginLeft: 2 }}>
              Username must contain one uppercase letter, at least 8 characters
              and one number
            </Typography>
            {isChangePasswordClicked ? (
              newPasswordFields()
            ) : (
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
                <Typography fontSize={'12px'} sx={{ marginLeft: 2 }}>
                  To change password click on the change password button below.
                </Typography>
              </div>
            )}
          </Box>
        </CardContent>
        {!isChangePasswordClicked && (
          <Button
            color="primary"
            variant="outlined"
            size="large"
            onClick={updatePassword}
            sx={{
              margin: '1em',
              alignItems: 'center',
              borderRadius: '30px',
              marginTop: 0.5,
            }}
          >
            CHANGE PASSWORD
            <ModeEditIcon fontSize="small" sx={{ marginLeft: 1 }} />
          </Button>
        )}
      </Card>
      <Card
        sx={{ minWidth: 275, borderRadius: '0px 0px 30px 30px', marginTop: 5 }}
      >
        <CardHeader title="View Additional Data Configurations" />
        <Divider />
        <CardContent>
          <div>
            All MSH and facility ID values should be between 0-25 characters and
            Should contain only A-Z, a-z, 0-9, _, -, and space characters. It
            should not contain |^&~"/ characters. If you think a value is
            incorrect, please contact your administrator
          </div>
          <Box sx={{ display: 'flex', gap: '2rem', marginTop: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {formFields
                .filter((field) => field.group === 1)
                .map((field) => (
                  <TextField
                    key={field.id}
                    name={field.name}
                    label={field.label}
                    variant="outlined"
                    value={field.value}
                    onChange={handleChange}
                    InputProps={InputProps}
                    error={
                      props.isNextButtonClicked &&
                      !!props.formErrors[field.name]
                    }
                    helperText={
                      props.isNextButtonClicked && props.formErrors[field.name]
                    }
                  />
                ))}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {formFields
                .filter((field) => field.group === 2)
                .map((field) => (
                  <TextField
                    key={field.id}
                    name={field.name}
                    label={field.label}
                    variant="outlined"
                    value={field.value}
                    onChange={handleChange}
                    InputProps={InputProps}
                    error={
                      props.isNextButtonClicked &&
                      !!props.formErrors[field.name]
                    }
                    helperText={
                      props.isNextButtonClicked && props.formErrors[field.name]
                    }
                  />
                ))}
            </Box>
          </Box>
          <Box sx={{ marginTop: '1rem' }}>
            {formFields
              .filter((field) => field.group === 3)
              .map((field) => (
                <TextField
                  key={field.id}
                  name={field.name}
                  label={field.label}
                  variant="outlined"
                  fullWidth
                  value={field.value}
                  onChange={handleChange}
                  InputProps={InputProps}
                  error={
                    props.isNextButtonClicked && !!props.formErrors[field.name]
                  }
                  helperText={
                    props.isNextButtonClicked && props.formErrors[field.name]
                  }
                />
              ))}
          </Box>
        </CardContent>
      </Card>
    </form>
  )
}

export default Identify
