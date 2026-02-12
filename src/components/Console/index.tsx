import { useState, useEffect } from 'react'
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
import InboundMessages from './InboundMessages'
import OutboundMessages from './OutboundMessages'
import DestinationDetailWidget from './DestinationDetailWidget'

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
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [rawResponse, setRawResponse] = useState<unknown>(null)
  const [refreshTime, setRefreshTime] = useState<string>('')
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [destinationsLoading, setDestinationsLoading] = useState(true)
  const [selectedConnection, setSelectedConnection] = useState('')
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
        const response = await fetch('/api/destinations')
        if (response.ok) {
          const data = await response.json()
          setDestinations(data)
          if (data.length > 0) {
            setSelectedConnection(data[0].destId)
          }
        }
      } catch (err) {
        console.error('Error fetching destinations:', err)
      } finally {
        setDestinationsLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchDestinations()
    }
  }, [status])

  // Automatically fetch data when page loads - MUST be before early returns
  useEffect(() => {
    // Only fetch if authenticated and is admin
    if (status !== 'authenticated' || !session?.user?.isAdmin) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError('')
      setRefreshTime(new Date().toLocaleTimeString())

      console.log('Starting Elasticsearch query...')

      try {
        // Query to get duration statistics from event.duration field
        const query = {
          query: {
            range: {
              '@timestamp': {
                gte: 'now-24h',
              },
            },
          },
          aggs: {
            stats: {
              stats: {
                field: 'event.duration',
              },
            },
          },
          size: 10,
        }

        console.log('Sending request to /api/elasticsearch/query', {
          index: 'izgw-config-console-dev',
          query: query,
        })

        // Call the API endpoint to execute the query
        const response = await fetch('/api/elasticsearch/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            index: 'izgw-config-console-dev',
            query: query,
          }),
        })

        console.log('Response status:', response.status)

        if (!response.ok) {
          let errorMessage = ''
          let errorDetails: unknown = {}

          try {
            errorDetails = await response.json()
            errorMessage =
              String(
                (errorDetails as Record<string, unknown>)?.message || ''
              ) ||
              String((errorDetails as Record<string, unknown>)?.error || '') ||
              `HTTP Error: ${response.statusText}`
          } catch (e) {
            errorMessage = response.statusText || 'Unknown error'
          }

          console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            details: errorDetails,
          })

          throw new Error(errorMessage)
        }

        const responseData = (await response.json()) as unknown

        setRawResponse(responseData)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(
          err instanceof Error
            ? err.message
            : 'An error occurred while fetching data'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [status, session?.user?.isAdmin])

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

  // Loading state while fetching
  if (loading) {
    return (
      <Container title="Operations Console">
        <AppHeaderBar open />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>Loading operational data...</Typography>
          </Box>
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
                    {dest.destId || dest.jurisdiction?.description}
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
          <InboundMessages />
          <OutboundMessages />
        </Item>
      </Box>
    </div>
  )
}

export default Console
