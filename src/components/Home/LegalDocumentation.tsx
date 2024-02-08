import React, { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import { PolicyOutlined } from '@mui/icons-material'
import { Button, Typography, Box } from '@mui/material'

import palette from '../../styles/theme/palette'

const customPaperStyles = {
  borderRadius: '0px 0px 30px 30px',
  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
  paddingBottom: '16px',
}
const actionButtonStyle = {
  borderRadius: 90,
  background: palette.white,
  boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
  width: 50,
  height: 50,
  transition: 'transform 0.15s ease-in-out',
  '&:hover': {
    transform: 'scale3d(1.15, 1.15, 1)',
  },
}
const LegalDocumentation = () => {
  const [open, setOpen] = useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <div>
      <Box
        display={'flex'}
        flexDirection={'column'}
        alignItems={'center'}
        justifyContent={'center'}
        gap={1}
      >
        <IconButton sx={actionButtonStyle} onClick={handleClickOpen}>
          <PolicyOutlined color="primary" />
        </IconButton>
        <Typography> Legal Documentation</Typography>
      </Box>
      <Dialog
        PaperProps={{
          style: customPaperStyles,
        }}
        open={open}
        onClose={handleClose}
      >
        <DialogTitle> Legal Documentation</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Ownership: The Software, including all intellectual property rights
            therein, is and shall remain the exclusive property of Licensor.
            Warranty
          </Typography>
          <Typography gutterBottom>
            Disclaimer: THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY
            KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
            WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
            NONINFRINGEMENT. LICENSOR DOES NOT WARRANT THAT THE SOFTWARE WILL BE
            ERROR-FREE OR UNINTERRUPTED. Limitation of Liability: IN NO EVENT
            SHALL LICENSOR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR EXEMPLARY DAMAGES ARISING OUT OF OR IN CONNECTION
            WITH THE USE OR PERFORMANCE OF THE SOFTWARE, EVEN IF LICENSOR HAS
            BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </Typography>
          <Typography gutterBottom>
            Governing Law: This Agreement shall be governed by and construed in
            accordance with the laws of [Jurisdiction], without regard to its
            conflict of law principles. Termination: This Agreement is effective
            until terminated. Licensor may terminate this Agreement immediately
            upon notice if Licensee breaches any provision of this Agreement.
            Upon termination, Licensee must cease all use of the Software and
            destroy all copies of the Software in its possession or control.
          </Typography>
          <Typography gutterBottom>
            Entire Agreement: This Agreement constitutes the entire agreement
            between the parties concerning the subject matter hereof and
            supersedes all prior or contemporaneous agreements, representations,
            warranties, and understandings, whether written or oral. By using
            the Software, Licensee agrees to be bound by the terms and
            conditions of this Agreement. If Licensee does not agree with any
            provision of this Agreement, Licensee should not use the Software.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default LegalDocumentation
