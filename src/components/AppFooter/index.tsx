import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Box, Container, Paper, Typography } from '@mui/material'
import pack from '../../../package.json'
import palette from '../../styles/theme/palette'
import CDCLogo from '../../public/United_States_Centers_for_Disease_Control_and_Prevention_logo 1.svg'

// Rendered once by Layout, after the page content and inside the same column,
// so it never extends under the navigation drawer and appears on every page.
const AppFooter = () => {
  return (
    <Paper
      component="footer"
      square
      sx={{
        bgcolor: palette.greyLight,
        boxShadow: '0px -4px 8px rgba(0, 0, 0, 0.20)',
      }}
    >
      <Container>
        <Box
          display={'flex'}
          justifyContent={'space-between'}
          flexDirection={{ xs: 'column', md: 'row' }}
          alignItems={'center'}
          gap={2}
          pt={1}
          pb={1}
          px={{ xs: 4, md: 1 }}
          textAlign={{ xs: 'center', md: 'left' }}
        >
          <Typography
            variant="caption"
            sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}
          >
            Version {pack.version}-{process.env.NEXT_PUBLIC_BUILD_ID} |
            Immunization (IZ) Gateway Configuration Console{' '}
            {new Date().getFullYear()}
          </Typography>
          <Box
            display={'flex'}
            justifyContent={{ xs: 'center', md: 'space-between' }}
            alignItems={'center'}
            gap={1}
            flexDirection={{ xs: 'column', sm: 'row' }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: { xs: '0.7rem', md: '0.75rem' },
                textAlign: { xs: 'center', md: 'left' },
              }}
            >
              This application has been authorized by the Centers for Disease
              Control and Prevention{' '}
            </Typography>
            <Box>
              <Link
                href={'https://www.cdc.gov/'}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image src={CDCLogo} width={27} height={15} alt="CDC Logo" />
              </Link>
            </Box>
          </Box>
        </Box>
      </Container>
    </Paper>
  )
}

export default AppFooter
