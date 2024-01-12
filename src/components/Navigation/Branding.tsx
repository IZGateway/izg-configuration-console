import * as React from 'react'
import Image from 'next/image'
import izgLogo from '../../public/IZG Logo 2023.svg'
import { CardContent, Typography, Avatar, Card, Box } from '@mui/material'
import palette from '../../styles/theme/palette'

const IZGLogo = () => {
  return (
    <Card
      sx={{
        display: 'flex',
        boxShadow: 0,
        background: palette.primaryDark,
        color: palette.white,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', pl: 1.5 }}>
        <Avatar sx={{ bgcolor: palette.primaryDark, width: 55, height: 55  }} alt="IZ Gateway Logo">
          <Image src={izgLogo} alt="izg logo" width={50} />
        </Avatar>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <CardContent sx={{ flex: '1 0 auto' }}>
          <Typography variant="h6" component="div">
            IZ Gateway
          </Typography>
          <Typography sx={{ marginTop: '-4px'}} variant="caption" component="div">
            Fast, Efficient, Accurate Data Sharing
          </Typography>
        </CardContent>
      </Box>
    </Card>
  )
}

export default IZGLogo
