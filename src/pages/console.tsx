import React, { useState, useEffect } from 'react'
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'

const Console = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [rawResponse, setRawResponse] = useState<any>(null)

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
      <Container maxWidth="sm">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">
            You do not have permission to access the Console. Admin access is
            required.
          </Alert>
        </Box>
      </Container>
    )
  }

  // Automatically fetch data when page loads
  useEffect(() => {
    // Only fetch if authenticated and is admin
    if (status !== 'authenticated' || !session?.user?.isAdmin) {
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError('')

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
          let errorDetails: any = {}

          try {
            errorDetails = await response.json()
            errorMessage =
              errorDetails?.message ||
              errorDetails?.error ||
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

        const responseData = await response.json()

        // Extract hits from the Elasticsearch response
        const hits = responseData.hits?.hits || []
        const parsedResults = hits.map((hit: any) => hit._source)

        setResults(parsedResults)
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

  // Loading state while fetching
  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>Loading Elasticsearch data...</Typography>
          </Box>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Title Section */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{ fontWeight: 'bold', mb: 1 }}
          >
            IZ Gateway Operations Console
          </Typography>
        </Box>

        {/* Error Section */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Response Time Metrics Cards */}
        {rawResponse && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 3,
            }}
          >
            {/* Average Response Time */}
            <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
              <CardContent>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ mb: 1 }}
                >
                  Average Response Time
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 'bold', color: '#388e3c' }}
                >
                  {rawResponse.aggregations?.stats?.avg !== undefined &&
                  rawResponse.aggregations?.stats?.avg !== null
                    ? (rawResponse.aggregations.stats.avg / 1000000).toFixed(2)
                    : 'N/A'}
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{ color: 'textSecondary', ml: 1 }}
                  >
                    ms
                  </Typography>
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* No Data Message */}
        {!rawResponse && !error && !loading && (
          <Alert severity="info">No data available</Alert>
        )}
      </Box>
    </Container>
  )
}

export default Console
