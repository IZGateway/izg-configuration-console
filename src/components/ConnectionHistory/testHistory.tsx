import * as React from 'react'
import {
  Typography,
  CardHeader,
  Card,
  CardContent,
  Divider,
} from '@mui/material'
import Timeline from '@mui/lab/Timeline'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import { TimelineOppositeContent } from '@mui/lab'
import Status from '../Status'
import useSWR from 'swr'

interface TestHistoryProps {
  destId: string
}

const timeline = (data) => (
  <>
    <Timeline
      sx={{
        margin: '0px 0px 8px 0px',
        padding: '0px',
      }}
    >
      {data.map((item, index) => (
        <TimelineItem key={item.id}>
          <TimelineOppositeContent
            sx={{
              content: 'none',
              flex: 0,
              padding: 0,
            }}
          ></TimelineOppositeContent>
          <TimelineSeparator>
            {index === 0 ? (
              <TimelineDot color="primary" />
            ) : (
              <TimelineDot sx={{ margin: '16px 0' }} variant="outlined" />
            )}
            {index !== data.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          <TimelineContent sx={{ fontWeight: '700', padding: '8px 16px' }}>
            Connection Tested
            <Typography variant="body2">
              {item.statusAt
                ? new Date(item.statusAt).toLocaleString('en-US', {
                    timeZone: 'America/New_York',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short',
                  })
                : 'Unknown'}
            </Typography>
          </TimelineContent>
          {index === 0 ? (
            <Status
              isConnected={item?.status.toLowerCase() === 'connected'}
              color={false}
            />
          ) : (
            <Status
              isConnected={item?.status.toLowerCase() === 'connected'}
              color={true}
            />
          )}
        </TimelineItem>
      ))}
    </Timeline>
    {/* Commenting this code as it is not part of MVP */}
    {/* <Button fullWidth variant="outlined" color="primary" sx={{ borderRadius: '30px'}}> Show More</Button> */}
  </>
)

const TestHistory = (props: TestHistoryProps) => {
  const { data, error, isLoading } = useSWR(
    props.destId ? `/api/statushistory/${props.destId}` : null
  )

  if (error) {
    throw new Error(error)
  }

  if (isLoading) return <div>loading...</div>

  const historyDataLength = data?.length
  const defaultTestHistoryView = data?.slice(0, 5)

  return (
    <div>
      <Card
        sx={{ marginTop: 4, borderRadius: '0px 0px 16px 16px' }}
        id="test-history"
      >
        <CardHeader
          sx={{
            '&& .MuiCardHeader-content': {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
          }}
          title="IZ Gateway Hub Status History"
        ></CardHeader>
        <Divider />
        <CardContent>
          {historyDataLength > 0 ? (
            timeline(defaultTestHistoryView)
          ) : (
            <p> There is no Test History at this time </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export default TestHistory
