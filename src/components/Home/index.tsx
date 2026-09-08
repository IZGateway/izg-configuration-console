import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import pack from '../../../package.json'
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
import SystemResourcesWidget from './SystemResourcesWidget'
import Slide from '@mui/material/Slide'
import isOperationsRole from '../../lib/security/accessutils'

function HomeComponent() {
  const [showFullContent, setShowFullContent] = useState(false)
  const { data: session } = useSession()
  const isAdmin = Boolean(session?.user?.isAdmin)
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
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'center', md: 'flex-start' },
              gap: { xs: 2, md: 0 },
              textAlign: { xs: 'center', md: 'left' },
            }}
          >
            <Slide in={true} timeout={1200} direction="down">
              <Box sx={{ flex: 1 }}>
                <Typography
                  sx={{
                    fontSize: { xs: '1.25rem', md: '1.5rem' },
                  }}
                >
                  Immunization (IZ) Gateway
                </Typography>
                <Typography
                  component={'h1'}
                  variant="h5"
                  sx={{
                    fontSize: { xs: '1.5rem', md: '2rem' },
                    mb: { xs: 2, md: 0 },
                  }}
                >
                  <strong>Configuration Console</strong>
                </Typography>
                <Box
                  display={'flex'}
                  flexDirection={{ xs: 'column', sm: 'row' }}
                  gap={2}
                  mt={4}
                  justifyContent={{ xs: 'center', md: 'flex-start' }}
                >
                  <Link href="/manageconnections">
                    <Button
                      variant="contained"
                      color="primary"
                      sx={{
                        width: { xs: '100%', sm: 'auto' },
                        minWidth: '200px',
                      }}
                    >
                      Manage Connections
                    </Button>
                  </Link>
                  {isOperationsRole(session?.user.roles) && (
                    <Link href="/api-doc">
                      <Button
                        variant="outlined"
                        color="primary"
                        sx={{
                          width: { xs: '100%', sm: 'auto' },
                          minWidth: '200px',
                        }}
                      >
                        OUR API
                      </Button>
                    </Link>
                  )}
                </Box>
              </Box>
            </Slide>
            <Box
              sx={{
                width: { xs: '100%', md: 300 },
                height: { xs: 120, md: 150 },
                display: 'flex',
                justifyContent: 'center',
                mt: { xs: 2, md: 0 },
              }}
            >
              <Slide in={true} timeout={1200} direction="down">
                <Box>
                  <Image
                    src={homePageBanner}
                    width={300}
                    height={180}
                    alt="general error image"
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                    }}
                  />
                </Box>
              </Slide>
            </Box>
          </Container>
        </Paper>

        <Container sx={{ px: { xs: 2, md: 3 } }}>
          <Box
            display={'flex'}
            flexDirection={{ xs: 'column', lg: 'row' }}
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
              sx={{ flex: { lg: 2 } }}
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
                      fontSize: { xs: '1.1em', md: '1.3em' },
                      fontWeight: '500',
                    }}
                    sx={{ pt: 2, pl: 2, pb: 0 }}
                    title="How does the IZ Gateway work?"
                    subheader="Here is a breakdown from our team."
                  />
                  <CardContent sx={{ px: { xs: 2, md: 3 } }}>
                    <Typography
                      gutterBottom
                      sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}
                    >
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
              <Slide in={true} timeout={1400} direction="up">
                <Box>
                  {isAdmin ? (
                    <SystemResourcesWidget />
                  ) : (
                    <Card
                      sx={{
                        width: '-webkit-fill-available',
                        borderRadius: '0px 0px 30px 30px',
                      }}
                    >
                      <CardHeader
                        titleTypographyProps={{
                          fontSize: { xs: '1.1em', md: '1.3em' },
                          fontWeight: '500',
                        }}
                        title="System Resources"
                        subheader="All Resources"
                        sx={{ pt: 2, pl: 2, pb: 0 }}
                      />
                      <CardContent sx={{ px: { xs: 2, md: 3 } }}>
                        <Typography
                          variant="body2"
                          sx={{ color: palette.greyDarkTypography }}
                        >
                          System resources are available to administrators only.
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              </Slide>
              <HomeCircleCallouts />
            </Box>
            <Box
              display={'flex'}
              flexDirection={'column'}
              gap={4}
              width={'-webkit-fill-available'}
              sx={{ flex: { lg: 1 } }}
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
                      fontSize: { xs: '1.1em', md: '1.3em' },
                      fontWeight: '500',
                    }}
                    title="Frequently Asked Questions"
                    sx={{ pt: 2, pl: 2, pb: 0 }}
                  />
                  <CardContent sx={{ px: { xs: 2, md: 3 } }}>
                    <Typography
                      variant="body2"
                      sx={{ fontSize: { xs: '0.85rem', md: '0.875rem' } }}
                    >
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
                      fontSize: { xs: '1.1em', md: '1.3em' },
                      fontWeight: '500',
                    }}
                    sx={{ pt: 2, pl: 2, pb: 0 }}
                    title="Use Cases"
                  />
                  <CardContent sx={{ px: { xs: 2, md: 3 } }}>
                    <Typography
                      variant="body2"
                      sx={{ fontSize: { xs: '0.85rem', md: '0.875rem' } }}
                    >
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
                      fontSize: { xs: '1.1em', md: '1.3em' },
                      fontWeight: '500',
                    }}
                    sx={{ pt: 2, pl: 2, pb: 0 }}
                    title="Supporting Documentation"
                  />
                  <CardContent sx={{ px: { xs: 2, md: 3 } }}>
                    <Typography
                      variant="body2"
                      sx={{ fontSize: { xs: '0.85rem', md: '0.875rem' } }}
                    >
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
            bottom: { xs: 0, md: -4 },
            ml: -4,
            zIndex: 10,
            boxShadow: '0px -4px 8px rgba(0, 0, 0, 0.20)',
            position: { xs: 'relative', md: 'sticky' },
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
                Immunization (IZ) Gateway Configuration Console 2025
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
