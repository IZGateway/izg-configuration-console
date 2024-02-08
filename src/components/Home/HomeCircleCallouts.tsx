import React from 'react'
import Box from '@mui/material/Box'
import FeedbackForm from './FeedBackForm'
import ReleaseNotes from './ReleaseNotes'
import LegalDocumentation from './LegalDocumentation'

const HomeCircleCallouts = ({}) => {
  return (
    <Box
      display={'flex'}
      justifyContent={'space-between'}
      flexDirection={'row'}
      pl={2}
      pr={2}
    >
      <ReleaseNotes />
      <LegalDocumentation />
      <FeedbackForm />
    </Box>
  )
}

export default HomeCircleCallouts
