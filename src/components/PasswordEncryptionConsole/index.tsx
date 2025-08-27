import * as React from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import Close from '../Close'
import SecurityIcon from '@mui/icons-material/Security'
import KeyIcon from '@mui/icons-material/Key'
import Image from 'next/image'
import securityImage from '../../public/CriticalSecruityOperation.svg'
import ConfirmationDialog from './confirmationDialog'
import CombinedContext from '../../contexts/app'
import CustomSnackbar from '../SnackBar'
import { useEffect } from 'react'
import Loader from '../Loader'

const PasswordEncryptionConsole = ({ hasKeyName }) => {
  const { setAlert, alert } = React.useContext(CombinedContext)
  const [openDialog, setOpenDialog] = React.useState(false)
  const [showSnackbar, setShowSnackbar] = React.useState(false)
  const [isEncrypted, setIsEncrypted] = React.useState(null)
  const [loadingInit, setLoadingInit] = React.useState(false)
  const [loadingRotate, setLoadingRotate] = React.useState(false)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/encryptionStatus')
        const data = await res.json()
        setIsEncrypted(data.encrypted)
      } catch (err) {
        console.error('Error fetching DB status', err)
        setIsEncrypted(false)
      }
    }
    fetchStatus()
  }, [])

  const handleDialog = () => {
    setOpenDialog(!openDialog)
  }
  const handleInitialization = async () => {
    setLoadingInit(true)
    try {
      const res = await fetch('/api/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()
      if (res.ok) {
        setShowSnackbar(true)
        setAlert({
          level: 'success',
          message: `Passwords encrypted successfully`,
        })
        setIsEncrypted(true)
      } else {
        setShowSnackbar(true)
        setAlert({
          level: 'error',
          message: `${data.error || 'Unknown error'}`,
        })
      }
    } catch (error) {
      throw new Error(error)
    } finally {
      setOpenDialog(false)
      setLoadingInit(false)
    }
  }

  const handleRotate = async () => {
    setLoadingRotate(true)
    try {
      const res = await fetch('/api/rotatekey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()
      if (res.ok) {
        setShowSnackbar(true)
        setAlert({
          level: 'success',
          message: `Password encryption key rotation is successful`,
        })
      } else {
        setShowSnackbar(true)
        setAlert({
          level: 'error',
          message: `${data.error || 'Unknown error'}`,
        })
      }
    } catch (error) {
      throw new Error(error)
    } finally {
      setOpenDialog(false)
      setLoadingRotate(false)
    }
  }

  const handleCloseSnackBar = () => {
    setShowSnackbar(false)
    setAlert({
      level: '',
      message: '',
    })
  }

  function Item(props) {
    const { sx, ...other } = props
    return (
      <Box
        sx={{
          ...sx,
        }}
        {...other}
      />
    )
  }
  return (
    <>
      <Close />
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 4,
        }}
      >
        <Item
          sx={{
            width: { xs: '100%', md: '60%' },
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h4" component="h1">
                Password Encryption
              </Typography>
              <Typography variant="h6" component="h2" color="text.secondary">
                Security Management Console
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ marginTop: 4, borderRadius: '0px 0px 16px 16px' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                Transform all plaintext passwords in your database using
                FIPS-compliant encryption. This operation ensures maximum
                security without requiring customer password resets.
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  gap: 4,
                  mt: 2,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: { xs: '100%', md: '50%' },
                  }}
                >
                  <Box>
                    <Typography variant="h5" component="h3" gutterBottom>
                      <KeyIcon
                        sx={{
                          verticalAlign: 'middle',
                          marginRight: 1,
                          color: 'primary.main',
                        }}
                      />
                      Key features
                    </Typography>
                    <List sx={{ listStyleType: 'disc', paddingLeft: 2 }}>
                      <ListItem sx={{ display: 'list-item', px: 0 }}>
                        <ListItemText primary="AWS Secret Store integration" />
                      </ListItem>
                      <ListItem sx={{ display: 'list-item', px: 0 }}>
                        <ListItemText primary="Individual transaction commits" />
                      </ListItem>
                    </List>
                  </Box>
                </Box>
                <Box width={{ xs: '100%', md: '50%' }}>
                  <Typography variant="h5" component="h3" gutterBottom>
                    <SecurityIcon
                      sx={{
                        verticalAlign: 'middle',
                        marginRight: 1,
                        color: 'primary.main',
                      }}
                    />
                    Safety Measures
                  </Typography>
                  <List sx={{ listStyleType: 'disc', paddingLeft: 2 }}>
                    <ListItem sx={{ display: 'list-item', px: 0 }}>
                      <ListItemText primary="Error handling and recovery" />
                    </ListItem>
                    <ListItem sx={{ display: 'list-item', px: 0 }}>
                      <ListItemText primary="Detailed audit logging" />
                    </ListItem>
                  </List>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ marginTop: 4, borderRadius: '0px 0px 16px 16px' }}>
            <CardContent sx={{ px: 4 }}>
              {isEncrypted === null ? (
                <Loader open={true} />
              ) : !isEncrypted ? (
                <Button
                  variant="contained"
                  size="large"
                  color="primary"
                  sx={{ textTransform: 'uppercase' }}
                  onClick={handleDialog}
                  disabled={!hasKeyName}
                >
                  Initialize Password Encryption
                </Button>
              ) : (
                <Button
                  variant="contained"
                  size="large"
                  color="primary"
                  sx={{ textTransform: 'uppercase' }}
                  onClick={handleRotate}
                >
                  Rotate Password Encryption
                </Button>
              )}
              <Loader open={loadingInit || loadingRotate} />
            </CardContent>
          </Card>
        </Item>

        <Item sx={{ flexGrow: 1 }}>
          <Card sx={{ marginTop: 0, borderRadius: '0px 0px 16px 16px' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Image
                  src={securityImage}
                  width={300}
                  height={300}
                  alt="security image"
                />
              </Box>
              <Typography variant="h6" gutterBottom>
                Critical Security Operation
              </Typography>
              <Typography paragraph>
                This operation will encrypt all plaintext passwords in the
                current environment. Please ensure you have proper database
                backups before proceeding.
              </Typography>
            </CardContent>
          </Card>
        </Item>
      </Box>
      <CustomSnackbar
        open={showSnackbar}
        severity={alert.level}
        message={alert.message}
        onClose={handleCloseSnackBar}
      />
      {openDialog && (
        <ConfirmationDialog
          open={openDialog}
          handleClose={handleDialog}
          handleInitialization={handleInitialization}
        />
      )}
    </>
  )
}
export default PasswordEncryptionConsole
