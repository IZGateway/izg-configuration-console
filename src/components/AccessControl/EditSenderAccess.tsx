import React, { useMemo, useState } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import palette from '../../styles/theme/palette'
import { type SenderData, mockSenderData } from './mockData'
import CustomSnackbar from '../SnackBar'

export type SenderAccessStatus = 'Onboarding' | 'Approved' | 'Disabled'

interface EditSenderAccessProps {
  senderId?: string
  initialData?: SenderData
  onSave?: (updated: SenderData) => void
  onCancel?: () => void
}

const statusOptions: SenderAccessStatus[] = [
  'Onboarding',
  'Approved',
  'Disabled',
]

const EditSenderAccess: React.FC<EditSenderAccessProps> = ({
  senderId,
  initialData,
  onSave,
  onCancel,
}) => {
  const sourceData = initialData ? [initialData] : mockSenderData

  const resolved = useMemo(() => {
    if (initialData) return initialData
    if (senderId) return sourceData.find((s) => s.id === senderId) || null
    return sourceData[0] || null
  }, [senderId, initialData, sourceData])

  const [form, setForm] = useState<SenderData | null>(resolved)
  const [snack, setSnack] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info' | 'warning'
  }>({ open: false, message: '', severity: 'success' })

  if (!form) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">Sender not found.</Typography>
      </Box>
    )
  }

  const handleStatusChange = (value: SenderAccessStatus) => {
    setForm({ ...form, status: value })
  }

  const handleSave = () => {
    const updated: SenderData = {
      ...form,
      lastActive: new Date().toLocaleDateString('en-US'),
    }
    onSave?.(updated)
    setSnack({
      open: true,
      message: `Updated access for ${updated.sender}.`,
      severity: 'success',
    })
  }

  return (
    <>
      <Box
        sx={{
          position: 'relative',
          zIndex: 10,
          height: 'auto',
          boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
          mb: 2,
          backgroundColor: palette.white,
          borderRadius: '4px',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', p: 2, gap: 0.5 }}>
          <Typography
            id="title-table"
            sx={{ fontSize: '1.75rem', fontWeight: 700 }}
          >
            Edit Sender Access
          </Typography>
          <Typography variant="caption" sx={{ color: palette.grey }}>
            Approve, disable, or update access for a sender-destination pair.
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          backgroundColor: 'white',
          borderRadius: '0 0 32px 32px',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
          p: 3,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Sender
            </Typography>
            <Typography variant="body1">{form.sender}</Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
              {form.senderDetails}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Destination
            </Typography>
            <Typography variant="body1">{form.destination}</Typography>
            <Chip
              label={form.destinationCode}
              size="small"
              variant="outlined"
              sx={{ mt: 0.5 }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
            mb: 2,
          }}
        >
          <TextField
            label="Access Level"
            value={form.accessLevel}
            fullWidth
            size="small"
            InputProps={{ readOnly: true }}
          />
          <TextField
            label="Connection Type"
            value={form.connectionType}
            fullWidth
            size="small"
            InputProps={{ readOnly: true }}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
            mb: 3,
          }}
        >
          <FormControl fullWidth size="small">
            <InputLabel id="status-label">Status</InputLabel>
            <Select
              labelId="status-label"
              label="Status"
              value={form.status}
              onChange={(e) =>
                handleStatusChange(e.target.value as SenderAccessStatus)
              }
            >
              {statusOptions.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Last Active"
            value={form.lastActive || ''}
            fullWidth
            size="small"
            InputProps={{ readOnly: true }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            color="error"
            onClick={onCancel}
            sx={{ borderRadius: '24px', px: 3 }}
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            onClick={handleSave}
            sx={{ borderRadius: '24px', px: 3 }}
          >
            Save Changes
          </Button>
        </Box>
      </Box>

      <CustomSnackbar
        open={snack.open}
        message={snack.message}
        severity={snack.severity}
        onClose={() => setSnack({ ...snack, open: false })}
      />
    </>
  )
}

export default EditSenderAccess
