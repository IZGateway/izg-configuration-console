import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  BoxProps,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material'
import { useSession } from 'next-auth/react'
import AppHeaderBar from '../AppHeader'
import Container from '../Container'
import InboundMessagesWidget from './InboundMessagesWidget'
import OutboundMessagesWidget from './OutboundMessagesWidget'
import DestinationDetailWidget from './DestinationDetailWidget'
import type { Organization } from './MessagesWidgetContent'

interface Destination {
  destId: string
  jurisdictionName?: string
  jurisdiction?: {
    jurisdictionId: number
    name: string
    description: string
  }
  destinationType?: {
    typeId: string
    typeName: string
  }
}

const Console = () => {
  const { data: session, status } = useSession()
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [destinationsLoading, setDestinationsLoading] = useState(true)
  const [destinationsError, setDestinationsError] = useState<string>('')
  const [selectedConnection, setSelectedConnection] = useState('')

  // Get the description for the selected destination
  const selectedDestinationDescription = useMemo(() => {
    const selectedDest = destinations.find(
      (d) => d.destId === selectedConnection
    )
    if (selectedDest?.jurisdiction?.description) {
      return `${selectedDest.jurisdiction.description} (${selectedConnection})`
    }
    return selectedConnection
  }, [destinations, selectedConnection])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [organizationsLoading, setOrganizationsLoading] = useState(false)

  function Item(props: BoxProps) {
    const { sx, ...other } = props
    return (
      <Box
        sx={{
          ...sx,
        }}
        {...other}
      />
    )
  }

  // Fetch destinations based on user session (admin or non-admin)
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        setDestinationsLoading(true)
        setDestinationsError('')
        const response = await fetch('/api/destinations')
        if (response.ok) {
          const data = await response.json()
          setDestinations(data)
          if (data.length > 0) {
            setSelectedConnection(data[0].destId)
          }
        } else {
          const errorMessage = `Failed to load destinations: ${response.status} ${response.statusText}`
          setDestinationsError(errorMessage)
          console.error(errorMessage)
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'An error occurred while fetching destinations'
        setDestinationsError(errorMessage)
        console.error('Error fetching destinations:', err)
      } finally {
        setDestinationsLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchDestinations()
    }
  }, [status])

  // Fetch organizations
  useEffect(() => {
    if (status !== 'authenticated') {
      setOrganizationsLoading(false)
      return
    }
    const fetchOrganizations = async () => {
      try {
        const response = await fetch('/api/organizations')
        if (!response.ok) {
          throw new Error('Failed to fetch organizations')
        }
        const orgData = await response.json()
        const processedOrgs: Organization[] = orgData.map(
          (org: { organizationName?: string; principalNames: string[] }) => ({
            organizationName: org.organizationName || 'Unknown Organization',
            principalNames: Array.from(org.principalNames || []),
          })
        )
        setOrganizations(processedOrgs)
      } catch (error) {
        console.error('Error fetching organizations:', error)
        setOrganizations([])
      } finally {
        setOrganizationsLoading(false)
      }
    }

    fetchOrganizations()
  }, [status])

  // Redirect if not authenticated or not admin
  if (status === 'loading') {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!session?.user?.isAdmin) {
    return (
      <Container title="Operations Console">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">
            You do not have permission to access the Console. Admin access is
            required.
          </Alert>
        </Box>
      </Container>
    )
  }

  return (
    <div>
      <AppHeaderBar open />
      <Box
        sx={{
          backgroundColor: 'white',
          borderRadius: '0px 0px 16px 16px',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e0e0e0',
          p: 3,
          mb: 4,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h1"
              fontWeight={700}
              fontSize="32px"
              id="operations-console"
              sx={{ mb: 1 }}
            >
              IZ Gateway Operations Console
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Instantly access the most relevant data, including recent trends,
              system status and usage patterns.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography
              variant="caption"
              color="primary"
              sx={{ whiteSpace: 'nowrap' }}
            >
              MANUAL REFRESH
            </Typography>
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          backgroundColor: 'white',
          borderRadius: '0px 0px 32px 32px',
          boxShadow: 'none',
          border: '1px solid #e0e0e0',
          p: 1.5,
          mb: 4,
        }}
      >
        {destinationsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {destinationsError}
          </Alert>
        )}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <FormControl sx={{ minWidth: 200 }}>
            <Select
              value={selectedConnection}
              onChange={(e) => setSelectedConnection(e.target.value)}
              disabled={destinationsLoading}
              sx={{
                fontSize: '16px',
                fontWeight: 500,
                '& .MuiOutlinedInput-notchedOutline': {
                  border: 'none',
                },
              }}
            >
              {destinationsLoading ? (
                <MenuItem value="">
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Loading...
                </MenuItem>
              ) : destinations.length === 0 ? (
                <MenuItem value="">No destinations available</MenuItem>
              ) : (
                destinations.map((dest) => (
                  <MenuItem key={dest.destId} value={dest.destId}>
                    {dest.jurisdiction?.description
                      ? `${dest.jurisdiction.description} (${dest.destId})`
                      : dest.destId}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{
              flex: 1,
              textAlign: 'right',
            }}
          >
            Use the dropdown menu to switch between connections or data sources,
            allowing you to explore metrics for different environments,
            accounts, or systems as needed.
          </Typography>
        </Box>
      </Box>
      <Box
        sx={{
          display: 'flex',
          gap: 4,
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        <Item
          sx={{
            width: { xs: '100%', md: '40%' },
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <DestinationDetailWidget selectedConnection={selectedConnection} />
        </Item>

        <Item sx={{ flexGrow: 1 }}>
          <OutboundMessagesWidget
            selectedConnection={selectedConnection}
            selectedConnectionDescription={selectedDestinationDescription}
            organizations={organizations}
            organizationsLoading={organizationsLoading}
            destinations={destinations}
          />
          <InboundMessagesWidget
            selectedConnection={selectedConnection}
            selectedConnectionDescription={selectedDestinationDescription}
            organizations={organizations}
            organizationsLoading={organizationsLoading}
          />
        </Item>
      </Box>
    </div>
  )
}

export default Console
