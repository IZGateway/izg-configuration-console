import React from 'react'
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  CardContent,
  CardHeader,
  Card,
  IconButton,
  CardActions,
} from '@mui/material'
import AppHeaderBar from '../AppHeader'
import palette from '../../styles/theme/palette'
import { ArrowForward, Star } from '@mui/icons-material'
import Image from 'next/image'
import generalError from '../../public/GeneralError.png'
import CDCLogo from '../../public/United_States_Centers_for_Disease_Control_and_Prevention_logo 1.svg'
import homePageBanner from '../../public/IZ-Gateway-BannerImagery.svg'
const actionButtonStyle = {
  borderRadius: 90,
  background: palette.white,
  boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
  width: 45,
  height: 45,
}

function HomeComponent() {
  return (
    <>
      <AppHeaderBar open />
      <Box
        sx={{
          mt: -8,
          ml: -4,
          width: '-webkit-fill-available',
          position: 'absolute',
          backgroundColor: palette.background,
          height: '100vh',
        }}
      >
        <Paper elevation={4} sx={{ pt: 8, pb: 4 }}>
          <Container
            sx={{
              display: 'flex',
              flexDirection: 'row ',
            }}
          >
            <Box>
              <Typography>IZ Gateway</Typography>
              <Typography component={'h1'} variant="h5">
                <strong>
                  Exchanging of immunization data between immunization
                  information systems (IISs), provider organizations, and
                  consumer applications.
                </strong>
              </Typography>
              <Box display={'flex'} flexDirection={'row'} gap={2} mt={4}>
                <Button variant="contained" color="primary">
                  Manage Connections
                </Button>
                <Button variant="outlined" color="primary">
                  OUR API
                </Button>
              </Box>
            </Box>
            <Box width={300} height={150}>
              <Image
                src={homePageBanner}
                width={300}
                height={180}
                alt="general error image"
              />
            </Box>
          </Container>
        </Paper>

        <Container>
          <Box
            display={'flex'}
            flexDirection={'row'}
            gap={4}
            justifyContent={'space-between'}
            width={'-webkit-fill-available'}
            mt={4}
            pb={16}
          >
            <Box
              display={'flex'}
              flexDirection={'column'}
              gap={6}
              justifyContent={'flex-start'}
              width={'75%'}
            >
              <Card
                sx={{
                  width: '-webkit-fill-available',
                }}
              >
                <CardHeader
                  title="What is IZ Gateway"
                  subheader="Here a breakdown from our team. "
                />
                <CardContent>
                  <Typography>
                    The IZ Gateway is a secure, cloud-based message routing
                    service that enables data exchange among jurisdiction
                    immunization information systems (IIS) and
                    multijurisdictional vaccine provider systems. It is also
                    designed to facilitate consumer access to their immunization
                    data. The IZ Gateway does not access or store immunization
                    data and meets all federal data security requirements. The
                    centralized data exchange facilitated by the IZ Gateway
                    eliminates the need for multiple, individual, point-to-point
                    connections between providers’ systems and IISs. It also
                    minimizes technical and policy data exchange challenges
                    through defined, streamlined IZ Gateway processes
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    endIcon={<ArrowForward />}
                  >
                    Learn More
                  </Button>
                </CardActions>
              </Card>
              <Box
                display={'flex'}
                justifyContent={'space-between'}
                flexDirection={'row'}
                pl={2}
                pr={2}
              >
                <Box
                  display={'flex'}
                  flexDirection={'column'}
                  alignItems={'center'}
                  justifyContent={'center'}
                  gap={1}
                >
                  <IconButton sx={actionButtonStyle}>
                    <Star color="primary" />
                  </IconButton>
                  <Typography>Something</Typography>
                </Box>
                <Box
                  display={'flex'}
                  flexDirection={'column'}
                  alignItems={'center'}
                  justifyContent={'center'}
                  gap={1}
                >
                  <IconButton sx={actionButtonStyle}>
                    <Star color="primary" />
                  </IconButton>
                  <Typography>Something</Typography>
                </Box>
                <Box
                  display={'flex'}
                  flexDirection={'column'}
                  alignItems={'center'}
                  justifyContent={'center'}
                  gap={1}
                >
                  <IconButton sx={actionButtonStyle}>
                    <Star color="primary" />
                  </IconButton>
                  <Typography>Something</Typography>
                </Box>
              </Box>
            </Box>
            <Box
              display={'flex'}
              flexDirection={'column'}
              gap={4}
              width={'-webkit-fill-available'}
            >
              <Card
                sx={{
                  width: '-webkit-fill-available',
                }}
              >
                <CardHeader
                  titleTypographyProps={{
                    fontSize: '1.3em',
                    fontWeight: '500',
                  }}
                  title="Frequently Asked Questions"
                  sx={{ p: 2, pb: 0 }}
                />
                <CardContent>
                  <Typography variant="body2">
                    Explore the frequently asked questions (FAQs) section for
                    the IZ Gateway, where you can find detailed answers and
                    insights into common queries
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    endIcon={<ArrowForward />}
                  >
                    Learn More
                  </Button>
                </CardActions>
              </Card>
              <Card
                sx={{
                  width: '-webkit-fill-available',
                }}
              >
                <CardHeader
                  titleTypographyProps={{
                    fontSize: '1.3em',
                    fontWeight: '500',
                  }}
                  sx={{ p: 2, pb: 0 }}
                  title="Use Cases"
                />
                <CardContent>
                  <Typography variant="body2">
                    This page contains comprehensive content detailing various
                    use cases related to four key elements: IIS-IIS
                    interactions, Provider-IIS relationships, IIS-CDC scenarios,
                    and Consumer Access functionalities,
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    endIcon={<ArrowForward />}
                  >
                    Learn More
                  </Button>
                </CardActions>
              </Card>
              <Card
                sx={{
                  width: '-webkit-fill-available',
                }}
              >
                <CardHeader
                  titleTypographyProps={{
                    fontSize: '1.3em',
                    fontWeight: '500',
                  }}
                  sx={{ p: 2, pb: 0 }}
                  title="Requirements"
                />
                <CardContent>
                  <Typography variant="body2">
                    Specific requirements for seamless integration and providing
                    essential guidelines for effective implementation and system
                    compatibility.
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    endIcon={<ArrowForward />}
                  >
                    Learn More
                  </Button>
                </CardActions>
              </Card>
            </Box>
          </Box>
        </Container>
        <Paper
          sx={{
            bgcolor: palette.greyLight,
            width: '-webkit-fill-available',
            bottom: 0,
            ml: -4,
            zIndex: 10,
            boxShadow: '0px -4px 8px rgba(0, 0, 0, 0.20)',
          }}
        >
          <Container>
            <Box
              display={'flex'}
              justifyContent={'space-between'}
              flexDirection={'row'}
              gap={2}
              pt={2}
              pb={2}
            >
              <Typography variant="caption">
                Version 1.0 | Placeholder
              </Typography>
              <Box
                display={'flex'}
                justifyContent={'space-between'}
                alignItems={'center'}
                gap={1}
              >
                <Typography variant="caption">
                  This application has been authorized by the Centers for
                  Disease Control and Prevention{' '}
                </Typography>
                <Image
                  src={CDCLogo}
                  width={20}
                  height={20}
                  alt="general error image"
                />
              </Box>
            </Box>
          </Container>
        </Paper>
      </Box>
    </>
  )
}
export default HomeComponent
