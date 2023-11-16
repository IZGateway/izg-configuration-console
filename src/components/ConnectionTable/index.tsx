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
import CheckIcon from '@mui/icons-material/Check'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

import SessionContext from '../../contexts/app'
import EditButton from './EditButton'

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
      field: 'destType',
      headerName: 'ENVIRONMENT',
      width: 150,
    },
    {
      field: 'jurisdictionName',
      headerName: 'JURISDICTION',
      width: 200,
    },
    {
      field: 'destUri',
      headerName: 'ENDPOINT URL',
      width: 550,
    },
    {
      field: 'status',
      headerName: 'STATUS',
      width: 200,
      filterable: false,
      valueFormatter: ({ value }) =>
        value?.toLowerCase() === 'connected' ? 'Connected' : 'Not Connected',
      renderCell: (params) => {
        const isConnected =
          params.row.status?.toLowerCase() === 'connected' ? true : false
        const asOfDate = params.row.statusAt
          ? new Date(params.row.statusAt).toLocaleString()
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
                        {params.row.status?.toUpperCase()}
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
                        {params.row.detail}
                      </Box>
                      <Box sx={{ fontWeight: 'bold' }}>Diagnostics:</Box>
                      <Box sx={{ fontWeight: 'regular', marginBottom: '8px' }}>
                        {params.row.diagnostics}
                      </Box>
                      <Box sx={{ fontWeight: 'bold' }}>Retry Strategy:</Box>
                      <Box sx={{ fontWeight: 'regular' }}>
                        {params.row.retryStrategy}
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
            <EditButton
              tabIndex={params.tabIndex}
              destId={params.id}
              destTypeId={params.row.destTypeId}
            />
            <Link
              tabIndex={params.tabIndex}
              href={{
                pathname: `/test/${params.id}`,
                query: { destType: params.row.destType },
              }}
            >
              <Tooltip arrow placement="bottom" title="Test">
                <IconButton
                  id={'test_' + params.row.destTypeId + '_' + params.id}
                  aria-label="test"
                  color="primary"
                  sx={actionButtonStyle}
                >
                  <MonitorHeartOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Link>
            <Link
              tabIndex={params.tabIndex}
              href={{
                pathname: `/history/${params.row.destTypeId}/${params.id}`,
                query: {
                  status: params.row.status,
                },
              }}
            >
              <Tooltip arrow placement="bottom" title="History">
                <IconButton
                  id={'history_' + params.row.destTypeId + '_' + params.id}
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
        experimentalFeatures={{ ariaV7: true }}
        sx={dataGridCustom}
        rows={Object.entries(data).map(([, x]: [any, any]) => {
          return {
            ...x[0],
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
        getRowId={(row) => row.destId}
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
              fields: ['destType', 'jurisdictionName', 'destUri', 'status'],
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
