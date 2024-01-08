import * as React from 'react'
import { styled, Avatar, Typography, Toolbar } from '@mui/material'
import MuiAppBar from '@mui/material/AppBar'
import Image from 'next/image'
import userImage from '../../public/userImage.png'
import { useSession } from 'next-auth/react'
import palette from '../../styles/theme/palette'

interface AppHeaderProps {
  open: boolean;
}

const AppBar = styled(MuiAppBar)({
  display: 'flex',
  background: palette.primaryLight,
  color: palette.greyDark,
  height: 84,
  boxShadow: '0px 0px 5px rgba(0, 0, 0, 0.25)',
  borderRadius: '0px 0px 30px 0px',
  margin: '-4em -1.5em 3em -3em',
  width: '-webkit-fill-available',
});

const AppHeaderBar = (props: AppHeaderProps) => {
  const { data: session, status } = useSession();

  return (
    <AppBar role="banner" position="sticky">
      <Toolbar id="app-header" sx={{ height: '84px' }}>
        <Avatar
          sx={{
            alt: 'User Image',
            marginRight: '16px',
            marginLeft: '4em',
            ...(props.open && { marginLeft: '16px' }),
          }}
        >
          <Image src={userImage} alt="your avatar" height={'70'} />
        </Avatar>
        <Typography fontWeight={'700'} fontSize={'16px'}>
          Welcome to IZ Gateway,{' '}
          {status === 'authenticated' && session.user.name}
        </Typography>
      </Toolbar>
    </AppBar>
  )
}

export default AppHeaderBar;
