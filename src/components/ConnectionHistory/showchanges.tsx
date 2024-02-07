import { Box, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import * as React from 'react'
import palette from '../../styles/theme/palette'

interface ShowChangesProps {
  fields: any
}

const ShowChanges = (props: ShowChangesProps) => {
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          gap: '2rem',
          alignItems: 'center',
          p: 2,
          borderRadius: '0 0 16px 16px',
          border: `1px solid ${palette.border}`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            width: '100%',
            gap: 1,
            flexDirection: 'column',
          }}
        >
          <Box>
            <Typography variant="body1" component="div">
              <strong>FROM</strong>
            </Typography>
          </Box>
          {Object.entries(props.fields).map(
            ([key, nestedObject]: [
              string,
              { newValue: string; oldValue: string }
            ]) => (
              <Box key={key}>
                <Typography
                  sx={{ fontWeight: 500 }}
                  variant="subtitle1"
                  component="div"
                >
                  {key}
                </Typography>
                <Typography key={key} gutterBottom variant="body2">
                  {`${nestedObject.oldValue}`}
                </Typography>
              </Box>
            )
          )}
        </Box>
        <ArrowForwardIcon htmlColor={palette.grey} />
        <Box
          sx={{
            display: 'flex',
            width: '100%',
            gap: 1,
            flexDirection: 'column',
          }}
        >
          <Box>
            <Typography variant="body1" component="div">
              <strong>TO</strong>
            </Typography>
          </Box>
          {Object.entries(props.fields).map(
            ([key, nestedObject]: [
              string,
              { newValue: string; oldValue: string }
            ]) => (
              <Box key={key} sx={{ backgroundColor: 'rgb(242, 208, 167, .2)' }}>
                <Typography
                  sx={{ fontWeight: 500 }}
                  variant="subtitle1"
                  component="div"
                >
                  {key}
                </Typography>
                <Typography key={key} gutterBottom variant="body2">
                  {`${nestedObject.newValue}`}
                </Typography>
              </Box>
            )
          )}
        </Box>
      </Box>
    </>
  )
}

export default ShowChanges
