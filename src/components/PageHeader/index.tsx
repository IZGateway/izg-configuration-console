import React from 'react'
import { Box, Card, SxProps, Theme, Typography } from '@mui/material'
import palette from '../../styles/theme/palette'

export interface PageHeaderProps {
  title: React.ReactNode
  subtitle: React.ReactNode
  // Kept per page so existing e2e locators (e.g. #title-table) still resolve.
  id?: string
  // Optional content on the right of the title, such as stat cards or a
  // refresh button. Stacks under the title on small screens.
  actions?: React.ReactNode
  sx?: SxProps<Theme>
}

// The title card shared by every page in the navigation, so they all present
// the same heading level, type scale and subtitle style.
const PageHeader = ({ title, subtitle, id, actions, sx }: PageHeaderProps) => {
  return (
    <Card
      sx={[
        {
          position: 'relative',
          zIndex: 10,
          height: 'auto',
          boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
          marginBottom: '16px',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        display="flex"
        flexDirection={{ xs: 'column', md: 'row' }}
        gap={{ xs: 2, md: 4 }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        sx={{ padding: 2 }}
      >
        <Box>
          <Typography
            id={id}
            component="h1"
            sx={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.3 }}
          >
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: palette.greyText }}>
            {subtitle}
          </Typography>
        </Box>
        {actions && (
          <Box sx={{ width: { xs: '100%', md: 'auto' } }}>{actions}</Box>
        )}
      </Box>
    </Card>
  )
}

export default PageHeader
