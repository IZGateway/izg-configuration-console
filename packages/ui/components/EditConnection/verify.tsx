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
} from '@mui/material'
import { styled } from '@mui/material/styles'

const StyledCategoryCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.palette.grey[200],
  fontWeight: 600
}))
const StyledDifferenceTableCell = styled(TableCell)(() => ({
  backgroundColor: 'rgb(242, 208, 167, .2)',
}))

const Verify = (props: any) => {
  delete props.value.confirmPassword
  delete props.value.newPassword
  const rows = Object.keys(props.value)
  return (
    <div>
      <Card sx={{ minWidth: 275, borderRadius: '0px 0px 30px 30px' }}>
        <CardHeader title="Review & Submit Changes" />
        <Divider />
        <CardContent>
          <div>
            Before you submit your edits, it's important to double-check that
            you've made all the changes you intended to make. Once you hit the
            "submit" button, your changes will be saved and it may not be
            possible to undo them. Take a moment to review your edits and make
            sure they accurately reflect your intended changes. If you're unsure
            about any of the edits, you may want to consult with a colleague or
            supervisor before submitting them. Remember, the changes you make
            can have a significant impact on the content, so it's essential to
            ensure that they are correct and appropriate. Thank you for taking
            the time to review your edits before submitting.
          </div>
          <Table sx={{ minWidth: 400 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}> Category</TableCell>
                <TableCell align="left" sx={{ fontWeight: 600 }}>Existing</TableCell>
                <TableCell align="left" sx={{ fontWeight: 600 }}>Submitting</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                props.destinationById[row] === props.value[row]
                  ?
                  <TableRow
                    key={row}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <StyledCategoryCell component="th" scope="row" >
                      {row.toUpperCase()}
                    </StyledCategoryCell>
                    <TableCell align="left">
                      {props.destinationById[row]}
                    </TableCell>
                    <TableCell align="left">{props.value[row]}</TableCell>
                  </TableRow>
                  :
                  <TableRow
                    key={row}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <StyledCategoryCell component="th" scope="row" >
                      {row.toUpperCase()}
                    </StyledCategoryCell>
                    <StyledDifferenceTableCell align="left">
                      {props.destinationById[row]}
                    </StyledDifferenceTableCell>
                    <StyledDifferenceTableCell align="left">{props.value[row]}</StyledDifferenceTableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default Verify
