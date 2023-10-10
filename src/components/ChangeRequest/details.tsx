import * as React from 'react'
import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { styled } from '@mui/material/styles'
const StyledCategoryCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.palette.grey[200],
  fontWeight: 600,
}))
const StyledDifferenceTableCell = styled(TableCell)(() => ({
  backgroundColor: 'rgb(242, 208, 167, .2)',
}))

const Details = (params: { existingValue: any; submittingValue: any }) => {
  const fieldNames = [
    'username',
    'facility_id',
    'MSH3',
    'MSH4',
    'MSH5',
    'MSH6',
    'MSH22',
    'RXA11',
    'PASSWORD',
  ]
  return (
    <div>
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
          {fieldNames.map((fieldNames) =>
            params.existingValue[fieldNames] ===
            params.submittingValue[fieldNames] ? (
              <TableRow
                key={fieldNames}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <StyledCategoryCell component="th" scope="row">
                  {fieldNames.toUpperCase()}
                </StyledCategoryCell>
                <TableCell align="left">
                  {params.existingValue[fieldNames]}
                </TableCell>
                <TableCell align="left">
                  {params.submittingValue[fieldNames]}
                </TableCell>
              </TableRow>
            ) : (
              <TableRow
                key={fieldNames}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <StyledCategoryCell component="th" scope="row">
                  {fieldNames.toUpperCase()}
                </StyledCategoryCell>
                <StyledDifferenceTableCell align="left">
                  {params.existingValue[fieldNames]}
                </StyledDifferenceTableCell>
                <StyledDifferenceTableCell align="left">
                  {params.submittingValue[fieldNames]}
                </StyledDifferenceTableCell>
              </TableRow>
            )
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default Details
