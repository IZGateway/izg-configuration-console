import React, { useContext, useState } from 'react'
import {
  DataGrid,
  GridColDef,
  GridFooter,
  GridFooterContainer,
  GridSlots,
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarQuickFilter,
} from '@mui/x-data-grid'
import {
  Box,
  Typography,
  Card,
  Tooltip,
  CardHeader,
  CardContent,
  Button,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import SessionContext from '../../contexts/app'
import ChangeRequestActionButtons from './ChangeRequestActionButtons'
import palette from '../../styles/theme/palette'
import PopOverActionButtons from './popOverActionButtons'
import Cookies from 'js-cookie'
import moment from 'moment'
import _ from 'lodash'
import TestConnectionButton from './TestConnectionButton'
import useRoleAccess from '../../lib/security/useRoleAccess'
import { ManageConnectionsPageAccessControl } from '../../lib/type/PageAccessControls'
import { useRouter } from 'next/router'
import Slide from '@mui/material/Slide'

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
    width: 'auto',
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
  '& .MuiDataGrid-selectedRowCount': {
    visibility: 'hidden',
    width: 0,
    marginLeft: '-8px',
  },
}
interface CustomToolbarProps {
  setFilterButtonEl: React.Dispatch<
    React.SetStateAction<HTMLButtonElement | null>
  >
  onTestReportsClick: () => void
}

const CustomToolbar = ({
  setFilterButtonEl,
  onTestReportsClick,
}: CustomToolbarProps) => {
  return (
    <GridToolbarContainer>
      <GridToolbarQuickFilter />
      <div style={{ marginLeft: 'auto' }}>
        <Button
          color="secondary"
          onClick={onTestReportsClick}
          variant="outlined"
          sx={{
            borderRadius: '24px',
            padding: '8px 16px',
            mr: '8px',
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          Test Report(s)
        </Button>
        <GridToolbarFilterButton ref={setFilterButtonEl} />
      </div>
    </GridToolbarContainer>
  )
}

const ConnectionsTable = (props) => {
  const { pageSize, setPageSize } = useContext(SessionContext)
  const [filterButtonEl, setFilterButtonEl] =
    React.useState<HTMLButtonElement | null>(null)
  const [showCheckbox, setShowCheckbox] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [isBoxVisible, setIsBoxVisible] = useState(false) // State to control box visibility
  const [endpointStatuses, setEndpointStatuses] = useState(props.data)
  const router = useRouter()
  const handleSelectionChange = (selection) => {
    setSelectedRows(selection)
  }

  const handleTestReportsClick = () => {
    setShowCheckbox((prev) => !prev)
    setIsBoxVisible((prev) => !prev)
  }

  const handleGenerateReport = (dataArray) => {
    Cookies.set('destination', JSON.stringify(dataArray), { path: '/' })
    router.push('/testreport')
  }
  const accessLevels: ManageConnectionsPageAccessControl = useRoleAccess()

  function CustomFooter({ selectedRow }) {
    const selectedRowCount = selectedRow.length
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          justifyContent: isBoxVisible ? 'space-between' : 'flex-end',
        }}
      >
        <>
          {isBoxVisible && (
            <Slide
              direction="up"
              in={isBoxVisible}
              mountOnEnter
              unmountOnExit
              appear={false}
            >
              <GridFooterContainer
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 16px',
                  gap: '16px',
                }}
              >
                <Box display={'flex'} flexDirection={'column'}>
                  <Typography
                    gutterBottom
                    variant="body1"
                    sx={{ fontWeight: 'bold', color: '#005763' }}
                  >
                    {selectedRowCount} Connections Selected
                  </Typography>
                  <Typography variant="body2">For Test Report</Typography>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleGenerateReport(selectedRow)}
                  disabled={selectedRowCount === 0}
                  sx={{
                    color: '#fff',
                    '&:hover': { backgroundColor: '#5a6268' },
                  }}
                >
                  Generate Report
                </Button>
              </GridFooterContainer>
            </Slide>
          )}
        </>
        <div>
          <Slide direction="up" in mountOnEnter unmountOnExit appear={false}>
            <GridFooter />
          </Slide>
        </div>
      </div>
    )
  }

  const columns: GridColDef[] = [
    {
      field: 'destId',
      headerName: 'DESTINATION ID',
      flex: 0.5,
      minWidth: 50,
      maxWidth: 130,
    },
    {
      field: 'destType',
      headerName: 'ENVIRONMENT',
      flex: 0.5,
      minWidth: 50,
      maxWidth: 157,
    },
    {
      field: 'jurisdictionName',
      headerName: 'ORGANIZATION',
      flex: 0.5,
      minWidth: 25,
      maxWidth: 162,
    },
    {
      field: 'destUri',
      headerName: 'ENDPOINT URL',
      flex: 0.5,
      minWidth: 50,
      maxWidth: 390,
    },
    {
      field: 'status',
      headerName: 'STATUS',
      flex: 0.75,
      minWidth: 50,
      maxWidth: 160,
      filterable: false,
      valueFormatter: ({ value }: { value: string | undefined }) =>
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
              {params.row.hasFutureMaintenance &&
                !params.row.hasActiveMaintenance && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ color: palette.warningDark }}>
                      This connection will be under maintenance from{' '}
                      {moment(
                        new Date(params.row.maintenanceValues.maint_start)
                      ).format('MMM DD, YYYY [at] h:mm A')}{' '}
                      {_.isNull(params.row.maintenanceValues) ? (
                        'ended by user'
                      ) : (
                        <>
                          <br />
                          until{' '}
                          {moment(
                            new Date(params.row.maintenanceValues.maint_end)
                          ).format('MMM DD, YYYY [at] h:mm A')}
                        </>
                      )}
                    </Typography>
                    <ErrorOutlineIcon
                      fontSize="small"
                      sx={{ marginLeft: 0.5, color: palette.errorDark }}
                    />
                  </Box>
                )}
              {params.row.hasActiveMaintenance &&
                !params.row.hasFutureMaintenance && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ color: palette.errorDark }}>
                      This connection is under maintenance until{' '}
                      {_.isNull(params.row.maintenanceValues)
                        ? 'ended by user'
                        : moment(
                            new Date(params.row.maintenanceValues.maint_end)
                          ).format('MMM DD, YYYY [at] h:mm A')}
                    </Typography>
                    <ErrorOutlineIcon
                      fontSize="small"
                      sx={{ marginLeft: 0.5, color: palette.errorDark }}
                    />
                  </Box>
                )}
              {!isConnected &&
                !params.row.hasActiveMaintenance &&
                !params.row.hasFutureMaintenance && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography>Not Connected</Typography>
                    <ErrorOutlineIcon
                      fontSize="small"
                      sx={{ marginLeft: 0.5 }}
                    />
                  </Box>
                )}
              {isConnected &&
                !params.row.hasActiveMaintenance &&
                !params.row.hasFutureMaintenance && (
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
      maxWidth: 160,
      renderCell: (params) => {
        return (
          <div>
            <ChangeRequestActionButtons
              tabIndex={params.tabIndex}
              destId={params.row.destId}
              destTypeId={params.row.destTypeId}
              hasChangeRequest={params.row.hasChangeRequest}
              hasActiveDraft={params.row.hasActiveDraft}
            />
            {accessLevels.canRunConnectionTest && (
              <TestConnectionButton
                tabIndex={params.tabIndex}
                destId={params.row.destId}
                destTypeId={params.row.destTypeId}
              />
            )}

            <PopOverActionButtons
              destId={params.row.destId}
              destTypeId={params.row.destTypeId}
              status={params.row.status}
              hasActiveMaintenance={
                params.row.hasActiveMaintenance ||
                params.row.hasFutureMaintenance
              }
              jurisdictionName={params.row.jurisdictionName}
              destType={params.row.destType}
              row={params.row}
              updateRow={updateRow}
            />
          </div>
        )
      },
    },
  ]

  const updateRow = (row) => {
    const updatedEndpointStatus = endpointStatuses.map((x) => {
      if (x.destId === row.destId) {
        return {
          ...row,
        }
      } else {
        return x
      }
    })
    setEndpointStatuses(updatedEndpointStatus)
  }

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
        rows={endpointStatuses}
        columns={columns}
        checkboxSelection={showCheckbox}
        pageSizeOptions={[5, 25, 50, 100]}
        autoHeight
        initialState={{
          sorting: {
            sortModel: [{ field: 'ORGANIZATION', sort: 'asc' }],
          },
          pagination: { paginationModel: { pageSize } },
          columns: {
            columnVisibilityModel: {
              destTypeId: false,
            },
          },
        }}
        onRowSelectionModelChange={handleSelectionChange}
        disableRowSelectionOnClick
        disableColumnMenu
        disableColumnSelector
        disableDensitySelector
        onPaginationModelChange={(model) => setPageSize(model.pageSize)}
        getRowId={(row) => row.destId + row.destTypeId}
        getRowClassName={(params) => {
          return params.row.hasActiveMaintenance === true ? 'highlight' : ''
        }}
        density={'comfortable'}
        pagination
        slots={{
          toolbar: CustomToolbar as GridSlots['toolbar'],
          footer: () => <CustomFooter selectedRow={selectedRows} />,
        }}
        slotProps={{
          toolbar: {
            setFilterButtonEl,
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 500 },
            columns: { field: 'action', filterable: false },
            onTestReportsClick: handleTestReportsClick,
          },
          panel: {
            anchorEl: filterButtonEl,
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
                marginTop: '16px',
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
