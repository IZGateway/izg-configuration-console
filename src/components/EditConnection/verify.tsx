import * as React from 'react'
import {
  Card,
  CardHeader,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  Divider,
  TableRow,
  Typography,
} from '@mui/material'
import { styled } from '@mui/material/styles'

const StyledCategoryCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.palette.grey[200],
  fontWeight: 600,
}))
const StyledDifferenceTableCell = styled(TableCell)(() => ({
  backgroundColor: 'rgb(242, 208, 167, .2)',
}))

const Verify = (props: any) => {
  let submittingValue
  let existingValue

  if (props.value.newPassword === '' && props.value.confirmPassword === '') {
    submittingValue = { ...props.value, password: '.........' }
    existingValue = { ...props, password: '.........' }
  } else {
    submittingValue = { ...props.value, password: props.value.newPassword }
    existingValue = { ...props, password: '.........' }
  }

  delete submittingValue.confirmPassword
  delete submittingValue.newPassword
  const rows = Object.keys(submittingValue)
  return (
    <div>
      <Card sx={{ minWidth: 275, borderRadius: '0px 0px 30px 30px' }}>
        <CardHeader
          title={
            <Typography component="h2" sx={{ fontWeight: 'bold' }} variant="h6">
              Review & Submit Changes
            </Typography>
          }
        />
        <Divider />
        <CardContent>
          <div>
            Before you submit your edits, it&apos;s important to double-check
            that you&apos;ve made all the changes you intended to make. Once you
            hit the &quot;submit&quot; button, your changes will be saved and it
            may not be possible to undo them. Take a moment to review your edits
            and make sure they accurately reflect your intended changes. If
            you&apos;re unsure about any of the edits, you may want to consult
            with a colleague or supervisor before submitting them. Remember, the
            changes you make can have a significant impact on the content, so
            it&apos;s essential to ensure that they are correct and appropriate.
            Thank you for taking the time to review your edits before
            submitting.
          </div>
          <Table sx={{ minWidth: 400 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}> Category</TableCell>
                <TableCell align="left" sx={{ fontWeight: 600 }}>
                  Existing
                </TableCell>
                <TableCell align="left" sx={{ fontWeight: 600 }}>
                  Submitting
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) =>
                existingValue[row] === submittingValue[row] ? (
                  <TableRow
                    key={row}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <StyledCategoryCell component="th" scope="row">
                      {row.toUpperCase()}
                    </StyledCategoryCell>
                    <TableCell align="left">{existingValue[row]}</TableCell>
                    <TableCell align="left">{submittingValue[row]}</TableCell>
                  </TableRow>
                ) : (
                  <TableRow
                    key={row}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <StyledCategoryCell component="th" scope="row">
                      {row.toUpperCase()}
                    </StyledCategoryCell>
                    <StyledDifferenceTableCell align="left">
                      {existingValue[row]}
                    </StyledDifferenceTableCell>
                    <StyledDifferenceTableCell align="left">
                      {submittingValue[row]}
                    </StyledDifferenceTableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default Verify
