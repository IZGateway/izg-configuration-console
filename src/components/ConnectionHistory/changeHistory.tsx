import * as React from 'react'
import {
  Typography,
  CardHeader,
  Card,
  CardContent,
  Divider,
  Chip,
  Button,
} from '@mui/material'
import Timeline from '@mui/lab/Timeline'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import { TimelineOppositeContent } from '@mui/lab'
import useSWR from 'swr'
import _ from 'lodash'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ShowChanges from './showchanges'
interface ChangeHistoryProps {
  destId: string
  destTypeId: string
}

const findDifferentKeysAndValues = (newObj, oldObj) => {
  if (!newObj || !oldObj) {
    console.error('One or both objects are undefined or null.')
    return {}
  }

  const allKeys = _.intersection(Object.keys(newObj), Object.keys(oldObj))
  const modifiedKeys = _.omit(allKeys, 'dest_uri')
  const differentKeysValues = {}

  _.each(modifiedKeys, (key) => {
    if (!_.isEqual(newObj[key], oldObj[key])) {
      if (key === 'password') {
        differentKeysValues[key] = {
          newValue: '.........',
          oldValue: '.........',
        }
      } else {
        differentKeysValues[key] = {
          newValue: newObj[key],
          oldValue: oldObj[key],
        }
      }
    }
  })

  if (newObj.is_password_different === '1' || newObj.isPasswordDifferent) {
    differentKeysValues['Password'] = {
      newValue: '.........',
      oldValue: '.........',
    }
  }
  return differentKeysValues
}

const ChangeHistory = (props: ChangeHistoryProps) => {
  const { data, error, isLoading } = useSWR(
    `/api/destinationaudit/${props.destTypeId}/${props.destId}`
  )
  const [openStates, setOpenStates] = React.useState(Array(5).fill(false))

  if (error) throw new Error(error.message)
  if (isLoading) return <div>loading...</div>
  if (!data) return <div>no data</div>
  const historyDataLength = data.length
  const defaultChangeHistoryView = data.slice(0, 5)

  const toggleOpenState = (index: number) => {
    setOpenStates((prevStates) => {
      const newStates = [...prevStates]
      newStates[index] = !newStates[index]
      return newStates
    })
  }
  const updatedFields = (data) => {
    return findDifferentKeysAndValues(data.newValues, data.oldValues)
  }

  const updatedKeys = (data) => {
    return Object.keys(updatedFields(data)).join(' , ')
  }
  const timeline = (data) => (
    <>
      <Timeline
        sx={{
          margin: '0px 0px 16px 0px',
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
            />
            <TimelineSeparator>
              {index === 0 ? (
                <TimelineDot color="primary" />
              ) : (
                <TimelineDot sx={{ margin: '16px 0' }} variant="outlined" />
              )}
              {index !== data.length - 1 && <TimelineConnector />}
            </TimelineSeparator>
            <TimelineContent sx={{ padding: '8px 16px' }}>
              <strong>{item.userName} </strong> updated {updatedKeys(item)}
              <Typography variant="body2">
                {new Date(item.createdAt).toLocaleString('en-US', {
                  timeZone: 'America/New_York',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })}
              </Typography>
              {openStates[index] ? (
                <>
                  <Button
                    sx={{ mt: 2 }}
                    variant="text"
                    color="primary"
                    onClick={() => toggleOpenState(index)}
                    id="hide"
                  >
                    Hide Changes
                    <ExpandLessIcon />
                  </Button>
                  <ShowChanges fields={updatedFields(item)} />
                </>
              ) : (
                <Button
                  sx={{ mt: 2 }}
                  variant="text"
                  color="primary"
                  onClick={() => toggleOpenState(index)}
                  id="show"
                >
                  Show Changes
                  <ExpandMoreIcon />
                </Button>
              )}
            </TimelineContent>
            <Typography gutterBottom variant="body1" component="div">
              <Chip
                label="Success"
                variant="outlined"
                color="primary"
                sx={{ borderRadius: 1 }}
              />
            </Typography>
          </TimelineItem>
        ))}
      </Timeline>
      {/* Commenting this code as it is not part of MVP */}
      {/* <Button fullWidth variant="outlined" color="primary" sx={{ borderRadius: '30px'}}> Show More</Button> */}
    </>
  )

  return (
    <div>
      <Card
        sx={{ marginTop: 4, borderRadius: '0px 0px 16px 16px' }}
        id="change-history"
      >
        <CardHeader
          sx={{
            '&& .MuiCardHeader-content': {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
          }}
          title="Change History"
        ></CardHeader>
        <Divider />
        <CardContent>
          {historyDataLength > 0 ? (
            timeline(defaultChangeHistoryView)
          ) : (
            <p> There is no Change History at this time </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export default ChangeHistory
