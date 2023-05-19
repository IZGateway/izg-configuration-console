import * as React from "react";
import {
  Typography,
  CardHeader,
  Card,
  CardContent,
  Divider,
  Chip,
} from "@mui/material";
import { useQuery } from "@apollo/client";
import { AUDIT_TRAIL } from "../../lib/queries/history/changeHistory";
import Timeline from "@mui/lab/Timeline";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";
import { TimelineOppositeContent } from "@mui/lab";
import { useSession } from "next-auth/react";

interface ChangeHistoryProps {
  destId: String;
}

const updatedFields = (data) => {
  let fields = Object.keys(data.newValues).join(" , ");
  var correction = {
    username: "user name",
    facility_id: "facility ID",
  };

  Object.keys(correction).forEach((key) => {
    fields = fields.replaceAll(key, correction[key]);
  });
  return fields;
};

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
          <TimelineContent sx={{ padding: "8px 16px" }}>
            <strong>{item.userName} </strong> updated {updatedFields(item)}
            <Typography variant="body2">
              {new Date(item.createdAt).toLocaleString("en-US", {
                timeZone: "America/New_York",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })}
            </Typography>
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
    {/* Commenting this code as it is not part of MVP*/}
    {/* <Button fullWidth variant="outlined" color="primary" sx={{ borderRadius: '30px'}}> Show More</Button>*/}
  </>
);

const ChangeHistory = (props: ChangeHistoryProps) => {
  const { data: session, status } = useSession();
  const { loading, error, data } = useQuery(AUDIT_TRAIL, {
    variables: {
      destId: props.destId,
      table: "destinations",
      user: session?.user?.name || undefined,
    },
  });

  if (loading) return null;
  if (error) {
    throw new Error(error.message);
  }
  if (!session) {
    throw new Error("Can not find session information");
  }
  const historyDataLength = data.auditBydestIdByUser.length;
  const defaultChangeHistoryView = data.auditBydestIdByUser.slice(0, 5);

  return (
    <div>
      <Card
        sx={{ marginTop: 4, borderRadius: "0px 0px 16px 16px" }}
        id="change-history"
      >
        <CardHeader
          sx={{
            "&& .MuiCardHeader-content": {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
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
  );
};
export default ChangeHistory;
