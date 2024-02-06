import { Box, Typography } from '@mui/material'
import * as React from 'react'

interface ShowChangesProps {
  fields: any
}

const ShowChanges = (props: ShowChangesProps) => {
  return (
    <>
      <Box sx={{ display: 'flex', gap: '2rem' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Box>
            <Typography variant="h6" component="div">
              FROM
            </Typography>
          </Box>
          {Object.entries(props.fields).map(
            ([key, nestedObject]: [
              string,
              { newValue: string; oldValue: string }
            ]) => (
              <Box key={key}>
                <Typography variant="subtitle1" component="div">
                  {key}
                </Typography>
                <Typography key={key} gutterBottom variant="caption">
                  {`${nestedObject.oldValue}`}
                </Typography>
              </Box>
            )
          )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Box>
            <Typography variant="h6" component="div">
              TO
            </Typography>
          </Box>
          {Object.entries(props.fields).map(
            ([key, nestedObject]: [
              string,
              { newValue: string; oldValue: string }
            ]) => (
              <Box key={key} sx={{ backgroundColor: 'rgb(242, 208, 167, .2)' }}>
                <Typography variant="subtitle1" component="div">
                  {key}
                </Typography>
                <Typography key={key} gutterBottom variant="caption">
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
