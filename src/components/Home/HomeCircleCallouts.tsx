import React from 'react'
import Box from '@mui/material/Box'
// import FeedbackForm from './FeedBackForm'
import ReleaseNotes from './ReleaseNotes'
import LegalDocumentation from './LegalDocumentation'
import { Slide } from '@mui/material'
import RequestSupport from './RequestSupport'

const HomeCircleCallouts = ({}) => {
  return (
    <Slide in={true} timeout={2000} direction="up">
      <Box
        display={'flex'}
        justifyContent="space-between"
        flexDirection={'row'}
        pl={2}
        pr={2}
        pt={2}
        gap={{ xs: 2, md: 20 }}
      >
        <ReleaseNotes />
        <LegalDocumentation />
        {/* <FeedbackForm /> */}
        <RequestSupport />
      </Box>
    </Slide>
  )
}

export default HomeCircleCallouts
