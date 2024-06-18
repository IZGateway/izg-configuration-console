import * as React from 'react'
import Image from 'next/image'
import izgLogo from '../../public/IZG Logo 2023.svg'
import { CardContent, Typography, Card, Box } from '@mui/material'
import palette from '../../styles/theme/palette'
import Link from 'next/link'

const IZGLogo = () => {
  return (
    <Card
      sx={{
        display: 'flex',
        boxShadow: 0,
        background: palette.primaryDark,
        color: palette.white,
        justifyContent: 'space-between',
      }}
    >
      <Link style={{ textDecoration: 'none', color: palette.white }} href="/">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-end',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Image src={izgLogo} alt="izg logo" width={58} />
          </Box>
          <CardContent sx={{ pr: 0, '&:last-child': { pb: 0 } }}>
            <Typography
              sx={{ fontWeight: '900', lineHeight: '1.7em' }}
              variant="h6"
              component="div"
            >
              IZ Gateway
            </Typography>
            <Typography
              sx={{
                marginTop: '-4px',
                textWrap: 'wrap',
                fontWeight: '300',
                lineHeight: '1.4em',
                fontSize: '10px',
              }}
              variant="caption"
              component="div"
            >
              Fast, Efficient, Accurate <br /> Data Sharing
            </Typography>
          </CardContent>
        </Box>
      </Link>
    </Card>
  )
}

export default IZGLogo
