import React, { useState } from 'react'
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
import { useSession } from 'next-auth/react'
import isOperationsRole from '../../lib/security/accessutils'

function HomeComponent() {
  const [showFullContent, setShowFullContent] = useState(false)
  const { data: session } = useSession()
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
                <Typography>Immunization (IZ) Gateway</Typography>
                <Typography component={'h1'} variant="h5">
                  <strong>Configuration Console</strong>
                </Typography>
                <Box display={'flex'} flexDirection={'row'} gap={2} mt={4}>
                  <Link href="/manageconnections">
                    <Button variant="contained" color="primary">
                      Manage Connections
                    </Button>
                  </Link>
                  {isOperationsRole(session?.user.role) && (
                    <Link href="/api-doc">
                      <Button variant="outlined" color="primary">
                        OUR API
                      </Button>
                    </Link>
                  )}
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
              width={'100%'}
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
                    title="How does the IZ Gateway work?"
                    subheader="Here is a breakdown from our team. "
                  />
                  <CardContent>
                    <Typography gutterBottom>
                      The IZ Gateway is a program that includes a technology
                      solution and infrastructure that facilitate immunization
                      data exchange.
                    </Typography>
                    <Typography gutterBottom>
                      The IZ Gateway technology is a router that moves
                      immunization data among jurisdictional immunization
                      information systems (IIS) and between IIS and public and
                      private vaccine-providing organizations (e.g., Veterans
                      Health Administration, physician’s offices, pharmacies).
                      The IZ Gateway also enables immunization data reporting to
                      CDC.
                    </Typography>
                    <Divider sx={{ mt: 2, mb: 2 }} />
                    <Typography gutterBottom variant="body2">
                      The IZ Gateway program provides processes and resources to
                      simplify making connections between the organizations
                      sending data and those receiving the data. These processes
                      and resources include centralized data use agreements that
                      govern the data&apos;s movement and use, policy support to
                      IZ Gateway users, and streamlined procedures for
                      onboarding and testing connections.
                    </Typography>

                    {showFullContent && (
                      <>
                        <Typography gutterBottom variant="body2">
                          The movement of immunization data, also called data
                          exchange, helps improve the completion and accuracy of
                          an individual’s vaccination record as well as the
                          availability of that record to their health care
                          providers for use in health care recommendations and
                          decision making.
                        </Typography>
                        <Typography gutterBottom variant="body2">
                          Data exchange also helps public health agencies have
                          more complete and accurate immunization data so they
                          can understand the vaccine coverage and the risks for
                          certain diseases in the communities they serve. These
                          data inform routine public health decisions and
                          preparations for disease outbreaks and emergencies.
                        </Typography>
                        <Typography gutterBottom variant="body2">
                          The IZ Gateway does not read or store personally
                          identifiable information (PII). It only transports
                          immunization data between parties who have agreed to
                          move the data through the IZ Gateway and who have
                          signed legal agreements that ensure all users agree to
                          the movement and use of the data by the receiving
                          party.
                        </Typography>
                        <Typography variant="caption" fontWeight={700}>
                          The IZ Gateway moves data; it does not store any
                          immunization information and never acts as a database
                          or data repository.
                        </Typography>
                      </>
                    )}
                    <Box>
                      <Button
                        onClick={() => setShowFullContent(!showFullContent)}
                        color="primary"
                        size="small"
                      >
                        {showFullContent ? 'Read Less' : 'Read More...'}
                      </Button>
                    </Box>
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
                      the Configuration Console, where you can find detailed
                      answers and insights into common queries.
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
                      To learn more about the four primary IZ Gateway use cases,
                      click the icon below. These use cases include IIS-to-IIS
                      data exchange, Provider-to-IIS data exchange, IIS-CDC
                      submission, and Consumer Access features.
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
                    title="Supporting Documentation"
                  />
                  <CardContent>
                    <Typography variant="body2">
                      For detailed information and guidance on implementation,
                      integration, and utilization of these systems, view our
                      comprehensive supporting documentation below and follow
                      the links provided.
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
                Version 1.2.0-{process.env.NEXT_PUBLIC_BUILD_ID} | Immunization
                (IZ) Gateway Configuration Console 2024
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
