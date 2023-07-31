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
  Tooltip,
  IconButton,
} from '@mui/material'
import ModeEditIcon from '@mui/icons-material/ModeEdit'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import CombinedContext from '../../contexts/app'
import { useContext } from 'react'

const Identify = (props: any) => {
  const { isChangePasswordClicked, setIsChangePasswordClicked } =
    useContext(CombinedContext)
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showConfirmNewPassword, setConfirmShowNewPassword] =
    React.useState(false)

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword)
  }

  const toggleConfirmNewPasswordVisibility = () => {
    setConfirmShowNewPassword(!showConfirmNewPassword)
  }

  const handleChange = (e) => {
    props.handleChange(e.target.name, e.target.value)
  }

  const updatePassword = () => {
    setIsChangePasswordClicked(true)
  }

  const getPasswordInputProps = (visible, togglePassword) => {
    return {
      endAdornment: (
        <InputAdornment position="end">
          <IconButton onClick={togglePassword} edge="end">
            {visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </IconButton>
        </InputAdornment>
      ),
    }
  }

  const getInputProps = (title) => {
    return {
      endAdornment: (
        <InputAdornment position="start">
          <Tooltip placement="top" arrow title={title}>
            <InfoOutlinedIcon />
          </Tooltip>
        </InputAdornment>
      ),
    }
  }
  const formFields = [
    {
      id: 'facilityId',
      name: 'facility_id',
      label: 'Facility ID',
      value: props.value.facility_id,
      group: 1,
      title:
        'The facility id is assigned by the IIS for each facility that connects to it through IZ Gateway for some use case (i.e., IIS SHARE, PATIENT ACCESS or PROVIDER CONNECT). If this value is not correct, the responding IIS will often fail with a security fault because the sender (as identified by facilityId) is not authorized to send messages to the IIS, even though the username and password may be correct.  IZ Gateway cannot distinguish between these security faults and those caused by an incorrect username or password.',
    },
    {
      id: 'msh4',
      name: 'MSH4',
      label: 'MSH-4',
      value: props.value.MSH4,
      group: 2,
      title:
        'Sending Facility: MSH.4 specifically represents the receiving application or system that is intended to receive and process.',
    },
    {
      id: 'msh6',
      name: 'MSH6',
      label: 'MSH-6',
      value: props.value.MSH6,
      group: 3,
      title:
        'Receiving Facility: MSH.6 is the receiving application among multiple identical instances of the application running on behalf of different organizations.',
    },
    {
      id: 'msh3',
      name: 'MSH3',
      label: 'MSH-3',
      value: props.value.MSH3,
      group: 1,
      title:
        'Sending Application: The MSH.3 field serves as a unique identifier for the sending application within a network enterprise & encompassing.',
    },
    {
      id: 'msh5',
      name: 'MSH5',
      label: 'MSH-5',
      value: props.value.MSH5,
      group: 2,
      title:
        'Receiving application: MSH.5 is the receiving application among all other applications within the network enterprise',
    },
    {
      id: 'msh22',
      name: 'MSH22',
      label: 'MSH-22',
      value: props.value.MSH22,
      group: 3,
      title: 'Version: MSH.22 represents the HL7 version being used.',
    },
    {
      id: 'rxa11',
      name: 'RXA11',
      label: 'RXA-11',
      value: props.value.RXA11,
      group: 4,
      title:
        'Administered-at Location: RXA-11 represents the facility where the vaccination is administered, and is an alternate way of identifying the sender.',
    },
    {
      id: 'new-password',
      name: 'newPassword',
      label: 'New Password',
      value: props.value.newPassword,
      group: 5,
      title:
        'Passwords must have a length of 15 characters. Passwords must include at least 2 of each the following: Numbers (0 through 9), Lowercase letters (a through z), Uppercase letters (A through Z), and Special Characters (!@#$%^()&)',
    },
    {
      id: 'confirm-new-password',
      name: 'confirmPassword',
      label: 'Confirm New Password',
      value: props.value.confirmPassword,
      group: 5,
      title:
        'Passwords must have a length of 15 characters. Passwords must include at least 2 of each the following: Numbers (0 through 9), Lowercase letters (a through z), Uppercase letters (A through Z), and Special Characters (!@#$%^()&)',
    },
  ]

  const newPasswordFields = () => {
    return (
      <div>
        <Typography fontSize={'12px'} sx={{ marginTop: 2 }}>
          Passwords must have a length of 15 characters. Passwords must include
          at least 2 of each the following: Numbers (0 through 9), Lowercase
          letters (a through z), Uppercase letters (A through Z), and Special
          Characters (!@#$%^()&)
        </Typography>
        {formFields
          .filter((field) => field.group === 5)
          .map((field) => (
            <TextField
              key={field.id}
              name={field.name}
              type={
                field.name === 'newPassword'
                  ? showNewPassword
                    ? 'text'
                    : 'password'
                  : showConfirmNewPassword
                  ? 'text'
                  : 'password'
              }
              label={field.label}
              variant="outlined"
              fullWidth
              sx={{ marginTop: 2 }}
              value={field.value}
              onChange={handleChange}
              InputProps={
                field.name === 'newPassword'
                  ? getPasswordInputProps(
                      showNewPassword,
                      toggleNewPasswordVisibility
                    )
                  : getPasswordInputProps(
                      showConfirmNewPassword,
                      toggleConfirmNewPasswordVisibility
                    )
              }
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
        <CardHeader
          title={
            <Typography component="h2" sx={{ fontWeight: 'bold' }} variant="h6">
              Configure Credentials
            </Typography>
          }
        />
        <Divider />
        <CardContent>
          <div>
            When editing connection credentials, it is important to exercise
            caution. Failure to do so can result in unauthorized access to
            sensitive information, which can be detrimental to individuals or
            organizations
          </div>
          <Box display="flex" flexDirection="column" gap="1rem">
            <TextField
              id="endpointURL"
              label="Endpoint URL"
              variant="filled"
              fullWidth
              disabled
              defaultValue={props.dest_uri}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="start">
                    <Tooltip
                      placement="top"
                      arrow
                      title={
                        'A specific URL or URI  that represents a particular resource or functionality provided by an API'
                      }
                    >
                      <InfoOutlinedIcon />
                    </Tooltip>
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
            <Typography fontSize={'12px'}>
              Username must contain one uppercase letter, at least 8 characters
              and one number
            </Typography>

            {isChangePasswordClicked ? (
              newPasswordFields()
            ) : (
              <div>
                <Typography fontSize={'12px'}>
                  To change password click on the change password button below.
                </Typography>
                <Button
                  color="primary"
                  variant="outlined"
                  size="large"
                  onClick={updatePassword}
                  sx={{
                    alignItems: 'center',
                    borderRadius: '30px',
                    marginTop: 0.5,
                  }}
                >
                  CHANGE PASSWORD
                  <ModeEditIcon fontSize="small" sx={{ marginLeft: 1 }} />
                </Button>
              </div>
            )}
          </Box>
        </CardContent>
      </Card>
      <Card
        sx={{ minWidth: 275, borderRadius: '0px 0px 30px 30px', marginTop: 5 }}
      >
        <CardHeader
          title={
            <Typography component="h2" sx={{ fontWeight: 'bold' }} variant="h6">
              View Additional Data Configurations
            </Typography>
          }
        />
        <Divider />
        <CardContent>
          <div>
            All MSH and facility ID values should be between 0-25 characters and
            Should contain only A-Z, a-z, 0-9, _, -, and space characters. It
            should not contain |^&~&quot;/ characters. If you think a value is
            incorrect, please contact your administrator
          </div>
          <Box sx={{ display: 'flex', gap: '2rem', marginTop: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
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
                    InputProps={getInputProps(field.title)}
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
          <Box sx={{ display: 'flex', gap: '2rem', marginTop: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
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
                    InputProps={getInputProps(field.title)}
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
          <Box sx={{ display: 'flex', gap: '2rem', marginTop: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
              {formFields
                .filter((field) => field.group === 3)
                .map((field) => (
                  <TextField
                    key={field.id}
                    name={field.name}
                    label={field.label}
                    variant="outlined"
                    value={field.value}
                    onChange={handleChange}
                    InputProps={getInputProps(field.title)}
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
              .filter((field) => field.group === 4)
              .map((field) => (
                <TextField
                  key={field.id}
                  name={field.name}
                  label={field.label}
                  variant="outlined"
                  fullWidth
                  value={field.value}
                  onChange={handleChange}
                  InputProps={getInputProps(field.title)}
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
