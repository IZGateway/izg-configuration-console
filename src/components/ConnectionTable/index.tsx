import React, { useContext } from 'react'
import useSWR from 'swr'
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid'
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined'
import {
  Box,
  IconButton,
  Typography,
  Card,
  Tooltip,
  CardHeader,
  CardContent,
} from '@mui/material'
import HistoryIcon from '@mui/icons-material/History'
import Link from 'next/link'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'


import SessionContext from '../../contexts/app'

const dataGridCustom = {
  '&.MuiDataGrid-root.MuiDataGrid-autoHeight.MuiDataGrid-root--densityComfortable':
  {
    marginTop: '-8px',
    zIndex: 1,
    paddingTop: '1em',
    border: 'none',
  },
  '& .MuiDataGrid-main': {
    marginTop: '-8px',
    backgroundColor: '#FFF',
    borderRadius: '0 0 30px 30px',
    border: '1px solid rgba(224, 224, 224, 1)',
    paddingBottom: '1em',
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
  },
  '& .MuiFormControl-root.MuiTextField-root.css-3be3ve-MuiFormControl-root-MuiTextField-root-MuiDataGrid-toolbarQuickFilter':
  {
    width: '32vw',
  },
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: '#FFF',
  },
  '& .MuiDataGrid-toolbarContainer': {
    display: 'flex',
    flexDirection: 'row-reverse',
    backgroundColor: '#FFF',
    padding: '24px 16px 16px 16px',
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(224, 224, 224, 1)',
    marginBottom: '8px',
  },
  '& svg.MuiSvgIcon-root.MuiSvgIcon-fontSizeSmall.MuiDataGrid-sortIcon.css-ptiqhd-MuiSvgIcon-root':
  {
    color: '#00D998',
  },
  '& .MuiDataGrid-footerContainer.MuiDataGrid-footerContainer': {
    width: '28em',
    borderRadius: '60px',
    float: 'right',
    margin: '2em 0',
    justifyContent: 'center',
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
    backgroundColor: '#FFF',
  },
  '& .MuiTablePagination-actions': {
    color: '#015A2F',
  },
  '& .MuiTablePagination-selectIcon.MuiSelect-icon.MuiSelect-iconStandard.css-pqjvzy-MuiSvgIcon-root-MuiSelect-icon':
  {
    color: '#015A2F',
  },
}

const actionButtonStyle = {
  borderRadius: 90,
  background: '#FFFFF',
  boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
  width: 35,
  height: 35,
  marginRight: 2,
}

const ConnectionsTable = () => {
  const { pageSize, setPageSize } = useContext(SessionContext)
  const { data, error, isLoading } = useSWR('/api/destinations')

  if (error) return <div>failed to load</div>
  if (isLoading) return <div>loading...</div>

  const columns: GridColDef[] = [
    {
      field: 'destination_type',
      valueFormatter: ({ value }) => value?.type,
      headerName: 'ENVIRONMENT',
      width: 150,
    },
    {
      field: 'dest_id',
      headerName: 'JURISDICTION',
      width: 200,
    },
    {
      field: 'dest_uri',
      headerName: 'ENDPOINT URL',
      width: 550,
    },
    {
      field: 'endpointstatus',
      headerName: 'STATUS',
      width: 200,
      filterable: false,
      valueFormatter: ({ value }) =>
        value?.status?.toLowerCase() === 'connected'
          ? 'Connected'
          : 'Not Connected',
      renderCell: ({ value }) => {
        const isConnected =
          value?.status?.toLowerCase() === 'connected' ? true : false
        const asOfDate = value?.ran_at
          ? new Date(value.ran_at).toLocaleString()
          : 'Unknown'
        return (
          <Tooltip
            arrow
            placement="top"
            componentsProps={{
              tooltip: {
                sx: {
                  backgroundColor: '#ffffff',
                  boxShadow: '0px 3px 5px rgb(0 0 0 / 25%)',
                  border: '1px solid #BFBFBF',
                  '& .MuiTooltip-arrow': {
                    color: '#BFBFBF',
                  },
                },
              },
            }}
            title={
              <React.Fragment>
                <Card elevation={0}>
                  <CardHeader
                    title={
                      <Typography sx={{ fontWeight: 'bold' }} color="#212121">
                        {value?.status.toUpperCase()}
                      </Typography>
                    }
                    subheader={
                      <Typography
                        sx={{ fontWeight: 'regular' }}
                        variant="body2"
                        color="#212121"
                      >
                        {asOfDate}
                      </Typography>
                    }
                  />
                  {!isConnected && (
                    <CardContent>
                      <Box sx={{ fontWeight: 'bold', marginTop: '-16px' }}>
                        Details:
                      </Box>
                      <Box sx={{ fontWeight: 'regular', marginBottom: '8px' }}>
                        {value?.detail}
                      </Box>
                      <Box sx={{ fontWeight: 'bold' }}>Diagnostics:</Box>
                      <Box sx={{ fontWeight: 'regular', marginBottom: '8px' }}>
                        {value?.diagnostics}
                      </Box>
                      <Box sx={{ fontWeight: 'bold' }}>Retry Strategy:</Box>
                      <Box sx={{ fontWeight: 'regular' }}>
                        {value?.retry_strategy}
                      </Box>
                    </CardContent>
                  )}
                </Card>
              </React.Fragment>
            }
          >
            <Typography gutterBottom variant="body1" component="div">
              {!isConnected ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography>Not Connected</Typography>
                  <ErrorOutlineIcon fontSize="small" sx={{ marginLeft: 0.5 }} />
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography>Connected</Typography>
                  <CheckIcon fontSize="small" sx={{ marginLeft: 0.5 }} />
                </Box>
              )}
            </Typography>
          </Tooltip>
        )
      },
    },
    {
      field: 'action',
      headerName: 'ACTION',
      sortable: false,
      filterable: false,
      width: 200,
      renderCell: (params) => {
        return (
          <div>
            <Link href={`/edit/${params.id}`}>
              <Tooltip arrow placement="bottom" title="Edit">
                <IconButton
                  id="edit"
                  aria-label="edit"
                  color="primary"
                  sx={actionButtonStyle}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Link>
            <Link href={`/test/${params.id}`}>
              <Tooltip arrow placement="bottom" title="Test">
                <IconButton
                  id="test"
                  aria-label="test"
                  color="primary"
                  sx={actionButtonStyle}
                >
                  <MonitorHeartOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Link>
            <Link href={`/history/${params.id}`}>
              <Tooltip arrow placement="bottom" title="History">
                <IconButton
                  id="history"
                  aria-label="history"
                  color="secondary"
                  sx={actionButtonStyle}
                >
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Link>
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <Box>
        <Card
          sx={{
            position: 'relative',
            zIndex: 10,
            height: 'auto',
            boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
            marginBottom: '-16px',
          }}
        >
          <Typography
            id="title-table"
            sx={{ padding: 2, fontSize: '1.75rem', fontWeight: 700 }}
            flexGrow={1}
            display="flex"
            align="center"
          >
            My Connections
          </Typography>
        </Card>
      </Box>
      <DataGrid
        sx={dataGridCustom}
        rows={data.map((x: any) => {
          return {
            ...x,
            dest_type: x.destination_type.type,
            jurisdiction: x.jurisdiction?.description || 'N/A',
            endpointstatus: x.endpointstatus[0],
          }
        })}
        columns={columns}
        pageSizeOptions={[5, 25, 50, 100]}
        autoHeight
        initialState={{
          sorting: {
            sortModel: [{ field: 'jurisdiction', sort: 'asc' }],
          },
          pagination: { paginationModel: { pageSize } },
        }}
        disableRowSelectionOnClick
        disableColumnMenu
        disableColumnSelector
        disableDensitySelector
        onPaginationModelChange={(model) => setPageSize(model.pageSize)}
        getRowId={(row) => row.dest_id}
        density={'comfortable'}
        pagination
        components={{ Toolbar: GridToolbar }}
        slotProps={{
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 500 },
            printOptions: { disableToolbarButton: true },
            columns: { field: 'action', filterable: false },
            csvOptions: {
              fields: [
                'dest_type',
                'jurisdiction',
                'dest_uri',
                'endpointstatus',
              ],
            },
          },
          panel: {
            placement: 'bottom-end',
            sx: {
              '& .MuiTypography-root': {
                fontSize: 20,
              },
              '& .MuiDataGrid-filterForm': {
                flexDirection: 'column',
                gap: '8px',
              },
              '& .MuiDataGrid-filterFormColumnInput': {
                width: '100%',
                display: 'flex',
              },
              '& .MuiDataGrid-filterFormOperatorInput': {
                width: '100%',
              },
              '& .MuiDataGrid-paper': {
                marginTop: '-73px',
                paddingBottom: '3vh',
                paddingTop: '1vh',
                paddingRight: '1vh',
                paddingLeft: '1vh',
                borderRadius: '0 0 30px 30px',
                border: '1px solid rgba(224, 224, 224, 1)',
                width: 'fit-content',
              },
              '& .MuiDataGrid-filterFormDeleteIcon': {
                flexDirection: 'row',
                marginRight: '-4px',
                marginBottom: '-16px',
                color: 'green',
              },
              '& .MuiDataGrid-filterFormValueInput': {
                width: '100%',
              },
            },
          },
        }}
      />
    </div>
  )
}

export default ConnectionsTable
