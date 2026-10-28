import React from 'react'
import { Box, Typography } from '@mui/material'
import palette from '../../styles/theme/palette'
import AnimatedNumber from '../Console/components/AnimatedNumber'

// A single count shown in a page header's actions area, e.g. API Key
// Management's key totals and API Documentation's endpoint totals.
export function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Box
      data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
      sx={{
        borderRadius: '12px',
        backgroundColor: palette.white,
        p: { xs: 1.5, md: 2 },
        border: `1px solid ${palette.border}`,
        // On small screens the cards share the row instead of overflowing it
        // at their fixed desktop width.
        flex: { xs: 1, md: 'initial' },
        minWidth: { xs: 0, md: 140 },
        textAlign: 'center',
      }}
    >
      {/* data-value holds the final count: the visible text counts up from 0
          (and repeats in a screen-reader live region), so it's not readable
          as the number mid-animation. */}
      <Typography
        data-testid="stat-card-value"
        data-value={value}
        sx={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}
      >
        <AnimatedNumber value={value} />
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: palette.greyText,
          fontWeight: 600,
          letterSpacing: '0.03em',
        }}
      >
        {label.toUpperCase()}
      </Typography>
    </Box>
  )
}

// The row the cards sit in, laid out for PageHeader's `actions` slot.
export function StatCardRow({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', gap: { xs: 1, md: 2 }, mb: { xs: 0, md: 3 } }}>
      {children}
    </Box>
  )
}
