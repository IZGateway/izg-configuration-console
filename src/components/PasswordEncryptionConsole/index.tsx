import * as React from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import Close from '../Close'
import SecurityIcon from '@mui/icons-material/Security'
import KeyIcon from '@mui/icons-material/Key'
import Image from 'next/image'
import securityImage from '../../public/CriticalSecruityOperation.svg'

const PasswordEncryptionConsole = () => {
  const handleInitialize = () => {
    console.log('hi')
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
      <Box sx={{ display: 'flex', gap: 4 }}>
        <Item sx={{ width: '60%', display: 'flex', flexDirection: 'column' }}>
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
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Transform all plaintext passwords in your database using
                FIPS-compliant encryption. This operation ensures maximum
                security without requiring customer password resets.
              </Typography>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
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
                        <ListItemText primary="Quantum-safe 256-bit key generation" />
                      </ListItem>
                      <ListItem sx={{ display: 'list-item', px: 0 }}>
                        <ListItemText primary="AWS Secret Store integration" />
                      </ListItem>
                      <ListItem sx={{ display: 'list-item', px: 0 }}>
                        <ListItemText primary="Environment-isolated processing" />
                      </ListItem>
                      <ListItem sx={{ display: 'list-item', px: 0 }}>
                        <ListItemText primary="Individual transaction commits" />
                      </ListItem>
                    </List>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="h5" component="h3" gutterBottom>
                    <KeyIcon
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
                      <ListItemText primary="Automatic backup verification" />
                    </ListItem>
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
            <CardContent>
              <Button
                variant="contained"
                size="large"
                color="primary"
                sx={{ textTransform: 'uppercase' }}
                onClick={handleInitialize}
              >
                Initialize Password Encryption
              </Button>
            </CardContent>
          </Card>
        </Item>

        <Item sx={{ flexGrow: 1 }}>
          <Card sx={{ marginTop: 4, borderRadius: '0px 0px 16px 16px' }}>
            <CardContent>
              <Box
                sx={{
                  marginTop: {
                    xs: '2em',
                    sm: '2em',
                    md: 'auto',
                    lg: 'auto',
                    xl: 'auto',
                  },
                  marginBottom: {
                    xs: '-2em',
                    sm: '-2em',
                    md: 'auto',
                    lg: 'auto',
                    xl: 'auto',
                  },
                  bottom: '-1em',
                }}
              >
                <Image
                  src={securityImage}
                  width={300}
                  height={200}
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
    </>
  )
}
export default PasswordEncryptionConsole
