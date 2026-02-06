import { Card, CardHeader, Typography, Box } from '@mui/material'

const DestinationDetailWidget = (props) => {
  return (
    <div>
      <Card
        sx={{
          marginTop: 4,
          borderRadius: '50px',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e0e0e0',
        }}
        id="my-izGateway-status-widget"
      >
        <CardHeader
          title="My IZ Gateway Status"
          subheader="Status Health - Last Updated at 3:45PM"
          titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
          subheaderTypographyProps={{ variant: 'body2', color: '#999' }}
          action={
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                mt: 0.5,
              }}
            >
              <Typography
                variant="h4"
                sx={{ color: '#1976d2', fontWeight: 700 }}
              >
                99.8%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                24H Uptime
              </Typography>
            </Box>
          }
          sx={{ pb: 2, px: 4 }}
        />
      </Card>
      <Card
        sx={{
          marginTop: 4,
          borderRadius: '50px',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e0e0e0',
        }}
        id="total-messages"
      >
        <CardHeader
          title="Total Messages (24h)"
          subheader="All Message Traffic"
          titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
          subheaderTypographyProps={{ variant: 'body2', color: '#999' }}
          action={
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                mt: 0.5,
              }}
            >
              <Typography
                variant="h4"
                sx={{ color: '#1976d2', fontWeight: 700 }}
              >
                33,234
              </Typography>
              <Typography variant="body2" color="textSecondary">
                ↑ 12% Up From Yesterday
              </Typography>
            </Box>
          }
          sx={{ pb: 2, px: 4 }}
        />
      </Card>
      <Card
        sx={{
          marginTop: 4,
          borderRadius: '50px',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e0e0e0',
        }}
        id="success-rate"
      >
        <CardHeader
          title="Success Rate"
          subheader="Message Processing Status"
          titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
          subheaderTypographyProps={{ variant: 'body2', color: '#999' }}
          action={
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                mt: 0.5,
              }}
            >
              <Typography
                variant="h4"
                sx={{ color: '#1976d2', fontWeight: 700 }}
              >
                98.5%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Last 24 Hours
              </Typography>
            </Box>
          }
          sx={{ pb: 2, px: 4 }}
        />
      </Card>
    </div>
  )
}
export default DestinationDetailWidget
