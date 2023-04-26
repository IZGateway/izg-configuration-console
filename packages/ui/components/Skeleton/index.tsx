import * as React from "react";
import { Skeleton , Box, Card, CardContent, Divider } from "@mui/material";
const TestSkeleton = (props) => {
  return (
    <>
    <Box display="flex" flexDirection="column" alignItems="center">
      <Skeleton sx={{ marginBottom: 1}} variant="rectangular" width='65%' height={40} />
      <Skeleton sx={{ marginBottom: 6}} variant="rectangular" width='75%' height={24} />
    </Box>

   <Card data-testid="skeleton">
    <CardContent>
        <Skeleton sx={{ marginBottom: 2, marginTop: 1,}}variant="rectangular" width='30%' height={32} />
        <Divider/>
        <Skeleton sx={{ marginTop: 2,}}variant="rectangular" width='15%' height={24} />
        <Skeleton sx={{ marginBottom: 1, marginTop: 1 }} variant="text" width='100%' height={24} />
        <Skeleton sx={{ marginBottom: 1,}} variant="rectangular" width='25%' height={16} />
          <Box mb={2} mt={2} justifyContent="space-between" display="flex" gap={2}>
            <Box display="flex" width='100%' gap={2}>
              <Skeleton variant="circular" height="24px" width="24px"/>
              <Skeleton variant="rectangular" width='40%' height={24} />
            </Box>
              <Skeleton variant="rectangular" width='20%' height={24} />
          </Box>
          <Divider/>
          <Box mb={2} mt={2} justifyContent="space-between" display="flex" gap={2}>
            <Box display="flex" width='100%' gap={2}>
              <Skeleton variant="circular" height="24px" width="24px"/>
              <Skeleton variant="rectangular" width='40%' height={24} />
            </Box>
              <Skeleton variant="rectangular" width='20%' height={24} />
          </Box>
          <Divider/>
          <Box mb={2} mt={2} justifyContent="space-between" display="flex" gap={2}>
            <Box display="flex" width='100%' gap={2}>
              <Skeleton variant="circular" height="24px" width="24px"/>
              <Skeleton variant="rectangular" width='40%' height={24} />
            </Box>
              <Skeleton variant="rectangular" width='20%' height={24} />
          </Box>
          <Divider/>
          <Box mb={2} mt={2} justifyContent="space-between" display="flex" gap={2}>
            <Box display="flex" width='100%' gap={2}>
              <Skeleton variant="circular" height="24px" width="24px"/>
              <Skeleton variant="rectangular" width='40%' height={24} />
            </Box>
              <Skeleton variant="rectangular" width='20%' height={24} />
          </Box>
          <Divider/>
          <Box mb={2} mt={2} justifyContent="space-between" display="flex" gap={2}>
            <Box display="flex" width='100%' gap={2}>
              <Skeleton variant="circular" height="24px" width="24px"/>
              <Skeleton variant="rectangular" width='40%' height={24} />
            </Box>
              <Skeleton variant="rectangular" width='20%' height={24} />
          </Box>
          <Divider/>
          <Box mb={2} mt={2} justifyContent="space-between" display="flex" gap={2}>
            <Box display="flex" width='100%' gap={2}>
              <Skeleton variant="circular" height="24px" width="24px"/>
              <Skeleton variant="rectangular" width='40%' height={24} />
            </Box>
              <Skeleton variant="rectangular" width='20%' height={24} />
          </Box>
          <Divider/>
          <Box mb={2} mt={2} justifyContent="space-between" display="flex" gap={2}>
            <Box display="flex" width='100%' gap={2}>
              <Skeleton variant="circular" height="24px" width="24px"/>
              <Skeleton variant="rectangular" width='40%' height={24} />
            </Box>
              <Skeleton variant="rectangular" width='20%' height={24} />
          </Box>
          <Divider/>
          <Box mb={2} mt={2} justifyContent="space-between" display="flex" gap={2}>
            <Box display="flex" width='100%' gap={2}>
              <Skeleton variant="circular" height="24px" width="24px"/>
              <Skeleton variant="rectangular" width='40%' height={24} />
            </Box>
              <Skeleton variant="rectangular" width='20%' height={24} />
          </Box>
          <Divider/>
          <Box mb={2} mt={2} justifyContent="space-between" display="flex" gap={2}>
            <Box display="flex" width='100%' gap={2}>
              <Skeleton variant="circular" height="24px" width="24px"/>
              <Skeleton variant="rectangular" width='40%' height={24} />
            </Box>
              <Skeleton variant="rectangular" width='20%' height={24} />
          </Box>
          <Divider/>
          <Box mb={2} mt={2} justifyContent="space-between" display="flex" gap={2}>
            <Box display="flex" width='100%' gap={2}>
              <Skeleton variant="circular" height="24px" width="24px"/>
              <Skeleton variant="rectangular" width='40%' height={24} />
            </Box>
              <Skeleton variant="rectangular" width='20%' height={24} />
          </Box>
          <Divider/>
          <Box mb={2} mt={2} justifyContent="space-between" display="flex" gap={2}>
            <Box display="flex" width='100%' gap={2}>
              <Skeleton variant="circular" height="24px" width="24px"/>
              <Skeleton variant="rectangular" width='40%' height={24} />
            </Box>
              <Skeleton variant="rectangular" width='20%' height={24} />
          </Box>
          <Divider/>
        </CardContent>
      </Card>
      <Box display="flex" flexDirection="column" alignItems="center">
        <Skeleton sx={{ marginTop: 6, borderRadius:"24px" }} variant="rectangular" width='70%' height={40} />
      </Box>
      </>
  );
};

export default TestSkeleton;
