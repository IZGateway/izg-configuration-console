import { Box, Button } from '@mui/material'
const AcceptButton = (props: { handleAccept: any; agreed: boolean }) => {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Button
        id="accept"
        variant="contained"
        color="primary"
        size="large"
        onClick={props.handleAccept}
        disabled={!props.agreed}
        sx={{
          background: 'secondary',
          borderRadius: '37.5px',
          margin: '1em',
          alignItems: 'center',
          width: 350,
        }}
      >
        ACCEPT
      </Button>
    </Box>
  )
}

export default AcceptButton
