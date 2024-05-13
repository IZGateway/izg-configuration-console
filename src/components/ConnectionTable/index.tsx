import React, { useContext } from 'react'
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

import Link from 'next/link'
import CheckIcon from '@mui/icons-material/Check'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import SessionContext from '../../contexts/app'
import ChangeRequestActionButtons from './ChangeRequestActionButtons'
import palette from '../../styles/theme/palette'
import PopOverActionButtons from './popOverActionButtons'
import moment from 'moment'
import _ from 'lodash'

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
    backgroundColor: palette.white,
    borderRadius: '0 0 30px 30px',
    border: `1px solid ${palette.border}`,
    paddingBottom: '1em',
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
  },
  '& .MuiDataGrid-row:hover': {
    bgcolor: '#00000010',
  },
  '& .MuiFormControl-root.MuiTextField-root.css-3be3ve-MuiFormControl-root-MuiTextField-root-MuiDataGrid-toolbarQuickFilter':
    {
      width: '32vw',
    },
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: palette.white,
  },
  '& .MuiDataGrid-toolbarContainer': {
    display: 'flex',
    flexDirection: 'row-reverse',
    backgroundColor: palette.white,
    padding: '24px 16px 16px 16px',
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
    border: `1px solid ${palette.border}`,
    marginBottom: '8px',
  },
  '& svg.MuiSvgIcon-root.MuiSvgIcon-fontSizeSmall.MuiDataGrid-sortIcon.css-ptiqhd-MuiSvgIcon-root':
    {
      color: palette.primary,
    },
  '& .MuiDataGrid-footerContainer.MuiDataGrid-footerContainer': {
    width: '28em',
    borderRadius: '60px',
    float: 'right',
    margin: '2em 0',
    justifyContent: 'center',
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
    backgroundColor: palette.white,
  },
  '& .MuiTablePagination-actions': {
    color: palette.primary,
  },
  '& .MuiTablePagination-selectIcon.MuiSelect-icon.MuiSelect-iconStandard.css-pqjvzy-MuiSvgIcon-root-MuiSelect-icon':
    {
      color: palette.primary,
    },
  '& .MuiDataGrid-virtualScroller': {
    overflow: 'hidden',
  },
  '.highlight': {
    bgcolor: palette.errorHighLight,
  },
}

const actionButtonStyle = {
  borderRadius: 90,
  background: palette.white,
  boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
  width: 35,
  height: 35,
  marginRight: 2,
}

const ConnectionsTable = (props) => {
  const { pageSize, setPageSize } = useContext(SessionContext)
  const columns: GridColDef[] = [
    {
      field: 'destType',
      headerName: 'ENVIRONMENT',
      flex: 0.5,
      minWidth: 50,
    },
    {
      field: 'jurisdictionName',
      headerName: 'ORGANIZATION',
      flex: 0.5,
      minWidth: 25,
    },
    {
      field: 'destUri',
      headerName: 'ENDPOINT URL',
      flex: 0.5,
      minWidth: 50,
    },
    {
      field: 'status',
      headerName: 'STATUS',
      flex: 0.75,
      minWidth: 100,
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
                  backgroundColor: palette.white,
                  boxShadow: '0px 3px 5px rgb(0 0 0 / 25%)',
                  border: `1px solid ${palette.border}`,
                  '& .MuiTooltip-arrow': {
                    color: palette.border,
                  },
                },
              },
            }}
            title={
              <React.Fragment>
                <Card elevation={0}>
                  <CardHeader
                    title={
                      <Typography
                        sx={{
                          fontWeight: 'bold',
                          color: palette.greyDarkTypography,
                        }}
                      >
                        {params.row.status?.toUpperCase()}
                      </Typography>
                    }
                    subheader={
                      <Typography
                        sx={{
                          fontWeight: 'regular',
                          color: palette.greyDarkTypography,
                        }}
                        variant="body2"
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
              {params.row.hasActiveMaint ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography sx={{ color: palette.errorDark }}>
                    This connection is under maintenance until{' '}
                    {_.isNull(params.row.getMaintenaceValues)
                      ? 'ended by user'
                      : moment(
                          new Date(params.row.getMaintenaceValues.maint_end)
                        ).format('MMM DD, YYYY [at] h:mm A')}
                  </Typography>
                  <ErrorOutlineIcon
                    fontSize="small"
                    sx={{ marginLeft: 0.5, color: palette.errorDark }}
                  />
                </Box>
              ) : !isConnected ? (
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
      flex: 0.5,
      minWidth: 100,
      renderCell: (params) => {
        return (
          <div>
            <ChangeRequestActionButtons
              tabIndex={params.tabIndex}
              destId={params.id}
              destTypeId={params.row.destTypeId}
              hasChangeRequest={params.row.hasChangeRequest}
              hasActiveDraft={params.row.hasActiveDraft}
            />
            <Link
              tabIndex={params.tabIndex}
              prefetch={false}
              href={{
                pathname: `/test/${params.row.destTypeId}/${params.id}`,
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
            <PopOverActionButtons
              destId={params.id}
              destTypeId={params.row.destTypeId}
              status={params.row.status}
              hasActiveMaintenance={params.row.hasActiveMaint}
              jurisdictionName={params.row.jurisdictionName}
              destType={params.row.destType}
            />
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
        rows={Object.entries(props.data).map(([, x]: [any, any]) => {
          return {
            ...x[0],
          }
        })}
        columns={columns}
        pageSizeOptions={[5, 25, 50, 100]}
        autoHeight
        initialState={{
          sorting: {
            sortModel: [{ field: 'ORGANIZATION', sort: 'asc' }],
          },
          pagination: { paginationModel: { pageSize } },
        }}
        disableRowSelectionOnClick
        disableColumnMenu
        disableColumnSelector
        disableDensitySelector
        onPaginationModelChange={(model) => setPageSize(model.pageSize)}
        getRowId={(row) => row.destId}
        getRowClassName={(params) => {
          return params.row.hasActiveMaint === true ? 'highlight' : ''
        }}
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
                border: `1px solid ${palette.border}`,
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
