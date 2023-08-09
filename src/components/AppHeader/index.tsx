import * as React from 'react'
import { styled, Avatar, Typography, Toolbar } from '@mui/material'
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar'
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
interface AppHeaderProps {
  open: boolean
}
interface AppBarProps extends MuiAppBarProps {
  open?: boolean
}
const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ open }) => ({
  ...(open && {
    marginLeft: '20em',
    width: `calc(100% - 19em)`,
  }),
}))

const AppHeaderBar = (props: AppHeaderProps) => {
  const { data: session, status } = useSession()

  return (
    <AppBar sx={headerStyle} position="fixed" open={props.open}>
      <Toolbar id="app-header" sx={{ height: '84px' }}>
        <Avatar
          sx={{
            alt: 'User Image',
            marginRight: '16px',
            marginLeft: '4em',
            ...(props.open && { marginLeft: '16px' }),
          }}
        >
          <Image src={userImage} alt="user image" height={'70'} />
        </Avatar>
        <Typography fontWeight={'700'} fontSize={'16px'}>
          Welcome {status === 'authenticated' && session.user.name} to IZ
          Gateway
        </Typography>
      </Toolbar>
    </AppBar>
  )
}

export default AppHeaderBar
