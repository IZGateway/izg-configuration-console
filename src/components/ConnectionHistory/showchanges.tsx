import { Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { styled } from '@mui/material/styles'

const StyledCategoryCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.palette.grey[200],
  fontWeight: 600,
}))
const StyledDifferenceTableCell = styled(TableCell)(() => ({
  backgroundColor: 'rgb(242, 208, 167, .2)',
}))

interface ShowChangesProps {
  fields: any
}

const ShowChanges = (props: ShowChangesProps) => {
  return (
    <>
      <Table sx={{ minWidth: 400 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}> FIELDS</TableCell>
            <TableCell align="left" sx={{ fontWeight: 600 }}>
              FROM
            </TableCell>
            <TableCell align="left" sx={{ fontWeight: 600 }}>
              TO
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(props.fields).map(
            ([key, nestedObject]: [
              string,
              { newValue: string; oldValue: string }
            ]) => {
              return (
                <TableRow
                  key={key}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <StyledCategoryCell component="th" scope="row">
                    {key}
                  </StyledCategoryCell>
                  <TableCell align="left">{`${nestedObject.oldValue}`}</TableCell>
                  <StyledDifferenceTableCell align="left">
                    {`${nestedObject.newValue}`}
                  </StyledDifferenceTableCell>
                </TableRow>
              )
            }
          )}
        </TableBody>
      </Table>
    </>
  )
}

export default ShowChanges
