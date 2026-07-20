import * as React from 'react'
import { Box, Typography, Card, CardContent } from '@mui/material'
import palette from '../../styles/theme/palette'

export interface InfoRow {
  label: string
  value: React.ReactNode
}

interface InfoPanelProps {
  title: string
  note?: React.ReactNode
  rows: InfoRow[]
}

// Presentational side panel used on the Admin Operations page (matches the
// "Details & Critical Security Operations" / "System Status" panels in the mockup).
const InfoPanel = ({ title, note, rows }: InfoPanelProps) => {
  return (
    <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          {title}
        </Typography>
        {note && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {note}
          </Typography>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {rows.map((row) => (
            <Box
              key={row.label}
              sx={{ bgcolor: palette.greyLight, borderRadius: 1, p: 1.5 }}
            >
              <Typography
                variant="caption"
                sx={{ textTransform: 'uppercase', color: palette.greyText }}
              >
                {row.label}
              </Typography>
              <Typography variant="body1">{row.value}</Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  )
}

export default InfoPanel
