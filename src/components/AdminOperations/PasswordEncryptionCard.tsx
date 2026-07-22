import * as React from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import KeyIcon from '@mui/icons-material/Key'
import SecurityIcon from '@mui/icons-material/Security'
import ConfirmationDialog from '../PasswordEncryptionConsole/confirmationDialog'
import Loader from '../Loader'

interface PasswordEncryptionCardProps {
  hasKeyName: boolean
  onResult: (result: { level: 'success' | 'error'; message: string }) => void
}

// Reuses the existing /api/encrypt, /api/rotatekey and /api/encryptionStatus
// endpoints; presented as a card for the unified Admin Operations page.
const PasswordEncryptionCard = ({
  hasKeyName,
  onResult,
}: PasswordEncryptionCardProps) => {
  const [openDialog, setOpenDialog] = React.useState(false)
  const [isEncrypted, setIsEncrypted] = React.useState<boolean | null>(null)
  const [loading, setLoading] = React.useState(false)

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch('/api/encryptionStatus')
      const data = await res.json()
      setIsEncrypted(data.encrypted)
    } catch {
      setIsEncrypted(false)
    }
  }, [])

  React.useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleEncrypt = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (res.ok) {
        onResult({ level: 'success', message: 'Passwords encrypted successfully' })
        setIsEncrypted(true)
      } else {
        onResult({ level: 'error', message: data.error || 'Unknown error' })
      }
    } catch {
      onResult({ level: 'error', message: 'Failed to encrypt passwords' })
    } finally {
      setOpenDialog(false)
      setLoading(false)
    }
  }

  const handleRotate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/rotatekey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (res.ok) {
        onResult({
          level: 'success',
          message: 'Password encryption key rotation is successful',
        })
        await fetchStatus()
      } else {
        onResult({ level: 'error', message: data.error || 'Unknown error' })
      }
    } catch {
      onResult({ level: 'error', message: 'Failed to rotate encryption key' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h4" component="h2">
          Password Encryption
        </Typography>
        <Typography variant="h6" component="p" color="text.secondary">
          Security Management Console
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography paragraph>
          Transform all plaintext passwords in your database using FIPS-compliant
          encryption. This operation ensures maximum security without requiring
          customer password resets.
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 4,
            mb: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="h3" gutterBottom>
              <KeyIcon
                sx={{ verticalAlign: 'middle', mr: 1, color: 'primary.main' }}
              />
              Key features
            </Typography>
            <List sx={{ listStyleType: 'disc', pl: 2 }}>
              <ListItem sx={{ display: 'list-item', px: 0 }}>
                <ListItemText primary="AWS Secret Store integration" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', px: 0 }}>
                <ListItemText primary="Individual transaction commits" />
              </ListItem>
            </List>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="h3" gutterBottom>
              <SecurityIcon
                sx={{ verticalAlign: 'middle', mr: 1, color: 'primary.main' }}
              />
              Safety Measures
            </Typography>
            <List sx={{ listStyleType: 'disc', pl: 2 }}>
              <ListItem sx={{ display: 'list-item', px: 0 }}>
                <ListItemText primary="Error handling and recovery" />
              </ListItem>
              <ListItem sx={{ display: 'list-item', px: 0 }}>
                <ListItemText primary="Detailed audit logging" />
              </ListItem>
            </List>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Button
            id="encrypt-passwords"
            variant="contained"
            color="primary"
            size="large"
            onClick={() => setOpenDialog(true)}
            disabled={!hasKeyName || isEncrypted === true}
            sx={{ borderRadius: 6, textTransform: 'uppercase' }}
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
            id="rotate-password-encryption"
            variant="outlined"
            color="primary"
            size="large"
            onClick={handleRotate}
            disabled={!hasKeyName || !isEncrypted}
            sx={{ borderRadius: 6, textTransform: 'uppercase' }}
            title={
              !hasKeyName
                ? 'Encryption key is not set, key rotation is unavailable.'
                : !isEncrypted
                ? 'All passwords must be encrypted before rotating the key.'
                : 'Click to rotate the password encryption key'
            }
          >
            Rotate Password Encryption
          </Button>
        </Box>
        <Loader open={loading} />
      </CardContent>
      {openDialog && (
        <ConfirmationDialog
          open={openDialog}
          handleClose={() => setOpenDialog(false)}
          handleInitialization={handleEncrypt}
        />
      )}
    </Card>
  )
}

export default PasswordEncryptionCard
