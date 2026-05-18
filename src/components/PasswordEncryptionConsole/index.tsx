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
    console.debug('[PasswordEncryptionConsole] hasKeyName:', hasKeyName)
  }, [hasKeyName])

  useEffect(() => {
    console.debug('[PasswordEncryptionConsole] isEncrypted changed:', isEncrypted, {
      encryptButtonDisabled: !hasKeyName || isEncrypted === true,
      rotateButtonDisabled: !hasKeyName || !isEncrypted,
      reason: !hasKeyName
        ? 'no encryption key configured'
        : isEncrypted === null
        ? 'status still loading'
        : isEncrypted
        ? 'all passwords already encrypted'
        : 'unencrypted passwords exist',
    })
  }, [isEncrypted, hasKeyName])

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        console.debug('[PasswordEncryptionConsole] fetching encryption status...')
        const res = await fetch('/api/encryptionStatus')
        const data = await res.json()
        console.debug('[PasswordEncryptionConsole] encryptionStatus response:', data)
        setIsEncrypted(data.encrypted)
      } catch (err) {
        console.error('[PasswordEncryptionConsole] Error fetching DB status', err)
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
        console.debug('[PasswordEncryptionConsole] encrypt succeeded — setting isEncrypted=true, encrypt button will disable')
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
        console.debug('[PasswordEncryptionConsole] rotate succeeded — setting isEncrypted=false, encrypt button will re-enable')
        setIsEncrypted(false)
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
                FIPS-compliant encryption.
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
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2,
                  }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    color="primary"
                    sx={{ textTransform: 'uppercase' }}
                    onClick={handleDialog}
                    disabled={!hasKeyName || isEncrypted === true}
                    title={
                      !hasKeyName
                        ? 'Encryption key is not set, the database cannot be encrypted.'
                        : isEncrypted === true
                        ? 'All passwords are already encrypted.'
                        : 'Click to encrypt any unencrypted destination passwords'
                    }
                  >
                    Encrypt Unencrypted Passwords
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    color="primary"
                    sx={{ textTransform: 'uppercase' }}
                    onClick={handleRotate}
                    disabled={!hasKeyName || !isEncrypted}
                    title={
                      !hasKeyName
                        ? 'Encryption key is not set, key rotation is unavailable.'
                        : !isEncrypted
                        ? 'All passwords must be encrypted before rotating the key.'
                        : 'Click to rotate the password encryption key'
                    }
                  >
                    Rotate Password Encryption Key
                  </Button>
                </Box>
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
