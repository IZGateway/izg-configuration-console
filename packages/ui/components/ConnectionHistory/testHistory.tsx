import * as React from "react";
import {
  Typography,
  Button,
  CardHeader,
  Card,
  CardContent,
  Divider,
  Chip,
} from "@mui/material";
import { useQuery } from "@apollo/client";
import { STATUS_HISTORY } from "../../lib/queries/history/connectionhistory";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import Timeline from "@mui/lab/Timeline";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";
import { TimelineOppositeContent } from "@mui/lab";
import moment from "moment";
import Status from "../Status";

interface TestHistoryProps {
  destId: String;
}

function msToTime(ms) {
  const duration = moment.duration(ms, "milliseconds");
  if (duration.asSeconds() < 60) return duration.asSeconds() + " Sec";
  else if (duration.asMinutes() < 60) return duration.asMinutes() + " Min";
  else if (duration.asHours() < 24) return duration.asHours() + " Hrs";
  else return duration.asDays() + " Day";
}

const timeline = (data) => (
  <>
    <Timeline
      sx={{
        margin: "0px 0px 16px 0px",
        padding: "0px",
      }}
    >
      {data.map((item, index) => (
        <TimelineItem key={item.id}>
          <TimelineOppositeContent
            sx={{
              content: "none",
              flex: 0,
              padding: 0,
            }}
          ></TimelineOppositeContent>
          <TimelineSeparator>
            {index === 0 ? (
              <TimelineDot color="primary" />
            ) : (
              <TimelineDot sx={{ margin: "16px 0" }} variant="outlined" />
            )}
            {index !== data.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          <TimelineContent sx={{ fontWeight: "700", padding: "8px 16px" }}>
            Connection Tested
            <Typography variant="body2">
              {item.ran_at
                ? new Date(item.ran_at).toLocaleString("en-US", {
                    timeZone: "America/New_York",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZoneName: "short",
                  })
                : "Unknown"}
            </Typography>
          </TimelineContent>
          {index === 0 ? (
            <Status status={item} color={false} />
          ) : (
            <Status status={item} color={true} />
          )}
        </TimelineItem>
      ))}
    </Timeline>
    {/* Commenting this code as it is not part of MVP*/}
    {/* <Button fullWidth variant="outlined" color="primary" sx={{ borderRadius: '30px'}}> Show More</Button>*/}
  </>
);

const TestHistory = (props: TestHistoryProps) => {
  const { loading, error, data } = useQuery(STATUS_HISTORY, {
    variables: { destId: props.destId },
  });
  if (loading) return null;
  if (error) {
    throw new Error(error.message);
  }

  const historyDataLength = data.endpointStatusHistoryByDestId.length;
  const defaultTestHistoryView = data.endpointStatusHistoryByDestId.slice(0, 5);
  const frequency = data.statusHistoryInterval.historyInterval;

  return (
    <div>
      <Card
        sx={{ marginTop: 4, borderRadius: "0px 0px 16px 16px" }}
        id="test-history"
      >
        <CardHeader
          sx={{
            "&& .MuiCardHeader-content": {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            },
          }}
          title="Test History"
          subheader={
            <Typography variant="caption">
              <ErrorOutlineIcon sx={{ fontSize: "1rem", mt: "8px" }} />
              Automated test run every {msToTime(frequency)}
            </Typography>
          }
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
  );
};
export default TestHistory;
