import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Container,
  Button,
  Slide,
  Typography,
  TextField,
  Divider,
  ButtonGroup,
} from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import palette from '../../styles/theme/palette'

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />
})

const customPaperStyles = {
  borderRadius: '0px 0px 30px 30px',
  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
  paddingBottom: '16px',
}

const ConfirmationDialog = (props) => {
  const [inputValue, setInputValue] = React.useState('')

  const isValid = inputValue.trim().toLowerCase() === 'encrypt'
  return (
    <div>
      <Container>
        <Dialog
          PaperProps={{
            style: customPaperStyles,
          }}
          open={props.open}
          TransitionComponent={Transition}
          onClose={props.handleClose}
          keepMounted
          aria-describedby="password-encryption-dialog-slide-description"
          sx={{ borderRadius: '0px 0px 30px 30px' }}
        >
          <DialogTitle>
            <div>
              <Typography
                component="h2"
                sx={{ fontWeight: 'bold' }}
                variant="h6"
              >
                Confirm Encrypt Unencrypted Passwords
              </Typography>
            </div>
          </DialogTitle>

          <Divider />
          <DialogContent>
            <div>
              <Typography variant="body1" color={palette.greyDarkTypography}>
                You are about to encrypt all plaintext (unencrypted) passwords.
                Already-encrypted passwords will not be affected. This action
                cannot be undone.
              </Typography>
              <Typography variant="body1" color={palette.greyDarkTypography}>
                Type &quot;Encrypt&quot; to confirm this critical operation:
              </Typography>
              <TextField
                label="Type 'Encrypt' to confirm"
                variant="outlined"
                fullWidth
                autoFocus
                sx={{ marginTop: 2 }}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
          </DialogContent>
          <ButtonGroup
            variant="contained"
            color="inherit"
            fullWidth
            disableElevation
            sx={{
              alignItems: 'center',
              borderRadius: '30px',
              px: 2,
              pb: 1,
            }}
          >
            <Button
              id="cancel"
              variant="outlined"
              color="primary"
              onClick={props.handleClose}
              sx={{ borderRadius: '30px' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={props.handleInitialization}
              id="encrypt"
              disabled={!isValid}
            >
              Start Encryption
            </Button>
          </ButtonGroup>
        </Dialog>
      </Container>
    </div>
  )
}

export default ConfirmationDialog
