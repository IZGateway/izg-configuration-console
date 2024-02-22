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
  CardActions,
  Divider,
} from '@mui/material'

import AppHeaderBar from '../AppHeader'
import palette from '../../styles/theme/palette'

import Image from 'next/image'
import CDCLogo from '../../public/United_States_Centers_for_Disease_Control_and_Prevention_logo 1.svg'
import homePageBanner from '../../public/IZ-Gateway-BannerImagery.svg'
import Link from 'next/link'
import UseCases from './UseCases'
import Requirements from './Requirements'
import HomeCircleCallouts from './HomeCircleCallouts'
import Faq from './Faqs'
import Slide from '@mui/material/Slide'

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
            <Slide in={true} timeout={1200} direction="down">
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
                  <Link href="/manage">
                    <Button variant="contained" color="primary">
                      Manage Connections
                    </Button>
                  </Link>
                  <Link href="/api-doc">
                    <Button variant="outlined" color="primary">
                      OUR API
                    </Button>
                  </Link>
                </Box>
              </Box>
            </Slide>
            <Box width={300} height={150}>
              <Slide in={true} timeout={1200} direction="down">
                <Image
                  src={homePageBanner}
                  width={300}
                  height={180}
                  alt="general error image"
                />
              </Slide>
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
            pb={8}
          >
            <Box
              display={'flex'}
              flexDirection={'column'}
              gap={6}
              justifyContent={'flex-start'}
              width={'75%'}
            >
              <Slide in={true} timeout={1200} direction="up">
                <Card
                  sx={{
                    width: '-webkit-fill-available',
                    borderRadius: '0px 0px 30px 30px',
                    zIndex: 4,
                  }}
                >
                  <CardHeader
                    titleTypographyProps={{
                      fontSize: '1.3em',
                      fontWeight: '500',
                    }}
                    sx={{ pt: 2, pl: 2, pb: 0 }}
                    title="What is IZ Gateway"
                    subheader="Here a breakdown from our team. "
                  />
                  <CardContent>
                    <Typography gutterBottom>
                      The IZ Gateway is a secure, cloud-based message routing
                      service that enables data exchange among jurisdiction
                      immunization information systems (IIS) and
                      multijurisdictional vaccine provider systems.
                    </Typography>
                    <Divider sx={{ mt: 2, mb: 2 }} />
                    <Typography variant="body2">
                      It is also designed to facilitate consumer access to their
                      immunization data. The IZ Gateway does not access or store
                      immunization data and meets all federal data security
                      requirements. The centralized data exchange facilitated by
                      the IZ Gateway eliminates the need for multiple,
                      individual, point-to-point connections between providers’
                      systems and IISs. It also minimizes technical and policy
                      data exchange challenges through defined, streamlined IZ
                      Gateway processes
                    </Typography>
                  </CardContent>
                </Card>
              </Slide>
              <HomeCircleCallouts />
            </Box>
            <Box
              display={'flex'}
              flexDirection={'column'}
              gap={4}
              width={'-webkit-fill-available'}
            >
              <Slide in={true} timeout={1200} direction="up">
                <Card
                  sx={{
                    width: '-webkit-fill-available',
                    borderRadius: '0px 0px 30px 30px',
                  }}
                >
                  <CardHeader
                    titleTypographyProps={{
                      fontSize: '1.3em',
                      fontWeight: '500',
                    }}
                    title="Frequently Asked Questions"
                    sx={{ pt: 2, pl: 2, pb: 0 }}
                  />
                  <CardContent>
                    <Typography variant="body2">
                      Explore the frequently asked questions (FAQs) section for
                      the IZ Gateway, where you can find detailed answers and
                      insights into common queries
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ mb: 2, ml: 1 }}>
                    <Faq />
                  </CardActions>
                </Card>
              </Slide>
              <Slide in={true} timeout={1600} direction="up">
                <Card
                  sx={{
                    width: '-webkit-fill-available',
                    borderRadius: '0px 0px 30px 30px',
                  }}
                >
                  <CardHeader
                    titleTypographyProps={{
                      fontSize: '1.3em',
                      fontWeight: '500',
                    }}
                    sx={{ pt: 2, pl: 2, pb: 0 }}
                    title="Use Cases"
                  />
                  <CardContent>
                    <Typography variant="body2">
                      This page contains comprehensive content detailing various
                      use cases related to four key elements: IIS-IIS
                      interactions, Provider-IIS relationships, IIS-CDC
                      scenarios, and Consumer Access functionalities,
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ mb: 2, ml: 1 }}>
                    <UseCases />
                  </CardActions>
                </Card>
              </Slide>
              <Slide in={true} timeout={2000} direction="up">
                <Card
                  sx={{
                    width: '-webkit-fill-available',
                    borderRadius: '0px 0px 30px 30px',
                  }}
                >
                  <CardHeader
                    titleTypographyProps={{
                      fontSize: '1.3em',
                      fontWeight: '500',
                    }}
                    sx={{ pt: 2, pl: 2, pb: 0 }}
                    title="Supoorting Documentation"
                  />
                  <CardContent>
                    <Typography variant="body2">
                      For detailed information and guidance on implementation,
                      integration, and utilization of these systems, access our
                      comprehensive supporting documentation. Discover how these
                      solutions can enhance your immunization data management
                      and reporting processes.
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ mb: 2, ml: 1 }}>
                    <Requirements />
                  </CardActions>
                </Card>
              </Slide>
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
            position: 'fixed',
          }}
        >
          <Container>
            <Box
              display={'flex'}
              justifyContent={'space-between'}
              flexDirection={'row'}
              alignItems={'center'}
              gap={2}
              pt={1}
              pb={1}
            >
              <Typography variant="caption">
                Version 1.0 | Immunization (IZ) Gateway 2024
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
                <Box>
                  <Link href={'https://www.cdc.gov/'} target="_blank">
                    <Image
                      src={CDCLogo}
                      width={27}
                      height={15}
                      alt="CDC Logo"
                    />
                  </Link>
                </Box>
              </Box>
            </Box>
          </Container>
        </Paper>
      </Box>
    </>
  )
}
export default HomeComponent
