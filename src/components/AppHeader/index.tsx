import * as React from 'react'
import { Avatar, Typography, Toolbar, AppBar } from '@mui/material'
import Image from 'next/image'
import userImage from '../../public/userImage.png'
import { useSession } from 'next-auth/react'

const headerStyle = {
  display: 'flex',
  background: '#00D998',
  color: '#212121',
  height: 84,
  boxShadow: '0px 0px 5px rgba(0, 0, 0, 0.25)',
  borderRadius: '0px 0px 30px 0px',
}

const AppHeaderBar = () => {
  const { data: session, status } = useSession()
  return (
    <AppBar sx={headerStyle} position={'sticky'}>
      <Toolbar id="app-header">
        <Avatar
          sx={{
            alt: 'User Image',
            marginRight: '16px',
            marginLeft: 45,
          }}
        >
          <Image src={userImage} alt="user image" height={'70'} />
        </Avatar>
        <Typography
          flexGrow={1}
          fontWeight={'700'}
          fontSize={'16px'}
          display="flex"
          align="center"
          lineHeight={'18px'}
        >
          | Welcome {status === 'authenticated' && session.user.name} to IZ
          Gateway
        </Typography>
      </Toolbar>
    </AppBar>
  )
}

export default AppHeaderBar
