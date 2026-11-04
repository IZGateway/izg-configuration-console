import React from 'react'
import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import palette from '../../styles/theme/palette'
import AnimatedNumber from '../Console/components/AnimatedNumber'

// A single count shown in a page header's actions area, e.g. API Key
// Management's key totals and API Documentation's endpoint totals.
//
// `colour`: styles the card like a Swagger operation row — a coloured border
// over a faint tint, with the label as a white-on-colour pill matching the
// method chips. Without it the card is plain white with a grey label.
export function StatCard({
  label,
  value,
  colour,
}: {
  label: string
  value: number
  colour?: string
}) {
  return (
    <Box
      data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
      sx={{
        borderRadius: '12px',
        backgroundColor: colour ? alpha(colour, 0.05) : palette.white,
        p: { xs: 1.5, md: 2 },
        border: `1px solid ${colour ?? palette.border}`,
        // On small screens the cards share the row instead of overflowing it
        // at their fixed desktop width.
        flex: { xs: 1, md: 'initial' },
        minWidth: { xs: 0, md: 140 },
        textAlign: 'center',
      }}
    >
      {/* data-value holds the final count: the visible text counts up from 0,
          so it's not readable as the number mid-animation. live={false}: a
          row of header counts would otherwise each announce a bare number on
          load (and on every refresh that changes one). */}
      <Typography
        data-testid="stat-card-value"
        data-value={value}
        sx={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}
      >
        <AnimatedNumber value={value} live={false} />
      </Typography>
      <Typography
        variant="caption"
        sx={
          colour
            ? {
                display: 'inline-block',
                mt: 0.5,
                px: 1.5,
                py: 0.25,
                borderRadius: '50px',
                backgroundColor: colour,
                color: palette.white,
                fontWeight: 700,
                letterSpacing: '0.03em',
              }
            : {
                color: palette.greyText,
                fontWeight: 600,
                letterSpacing: '0.03em',
              }
        }
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
