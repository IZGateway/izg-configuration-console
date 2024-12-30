import React from 'react'
import {
  DataGrid,
  GridFooter,
  GridSlots,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarQuickFilter,
} from '@mui/x-data-grid'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorIcon from '@mui/icons-material/Error'
import { Box, Typography, Card, Chip, Button } from '@mui/material'
import palette from '../../styles/theme/palette'
import router from 'next/router'
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
}

const renderStatus = (value) => {
  let color
  const label = value === 'SKIPPED' ? 'N/A' : value
  let icon = null

  if (value === 'PASS') {
    color = 'primary'
  } else if (value === 'WARNING') {
    color = 'warning'
    icon = <WarningAmberIcon fontSize="small" />
  } else if (value === 'FAIL') {
    color = 'error'
    icon = <ErrorIcon fontSize="small" />
  }

  return (
    <Chip
      icon={icon}
      label={label}
      variant="outlined"
      color={color}
      sx={{
        borderRadius: '4px',
        marginTop: '8px',
      }}
    />
  )
}
function CustomToolbar() {
  return (
    <GridToolbarContainer>
      <GridToolbarQuickFilter />
      <div style={{ marginLeft: 'auto' }}>
        <GridToolbarExport
          printOptions={{ disableToolbarButton: true }}
          csvOptions={{
            fields: [
              'jurisdiction',
              'destination',
              'environment',
              'dnsLookup',
              'tcpConnectivity',
              'tlsVersion',
              'cipherSuites',
              'connectivity',
              'wsdl',
              'hl7Query',
            ],
          }}
        />
      </div>
    </GridToolbarContainer>
  )
}
const handleGoBack = () => {
  router.push('/manageconnections')
}

const CustomFooter = () => {
  return (
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Button
        variant="outlined"
        onClick={handleGoBack}
        color="primary"
        sx={{
          borderRadius: '30px',
        }}
      >
        Go Back to Connections
      </Button>
      <GridFooter />
    </Box>
  )
}
const TestReportTable = ({
  connectionTestResults,
  destinations,
  destinationDetails,
}) => {
  const rows = destinations.map((dest, index) => ({
    id: dest.destId + dest.destTypeId,
    jurisdiction: destinationDetails[index]?.jurisdiction || 'N/A',
    destination: dest.destId,
    environment: destinationDetails[index]?.type || 'N/A',
    dnsLookup: connectionTestResults[index]?.dns || 'N/A',
    tcpConnectivity: connectionTestResults[index]?.tcp || 'N/A',
    tlsVersion: connectionTestResults[index]?.tls || 'N/A',
    cipherSuites: connectionTestResults[index]?.cipher || 'N/A',
    wsdl: connectionTestResults[index]?.wsdl || 'N/A',
    connectivity: connectionTestResults[index]?.connectivity || 'N/A',
    hl7Query: connectionTestResults[index]?.hl7 || 'N/A',
  }))

  const columns = [
    { field: 'jurisdiction', headerName: 'JURISDICTION', flex: 1 },
    { field: 'destination', headerName: 'DESTINATION', flex: 1 },
    { field: 'environment', headerName: 'ENVIRONMENT', flex: 1 },
    {
      field: 'dnsLookup',
      headerName: 'DNS LOOKUP',
      flex: 1,
      renderCell: (params) => renderStatus(params.value),
    },
    {
      field: 'tcpConnectivity',
      headerName: 'TCP CONNECTIVITY',
      flex: 1,
      renderCell: (params) => renderStatus(params.value),
    },
    {
      field: 'tlsVersion',
      headerName: 'TLS VERSION',
      flex: 1,
      renderCell: (params) => renderStatus(params.value),
    },
    {
      field: 'cipherSuites',
      headerName: 'CIPHER SUITES',
      flex: 1,
      renderCell: (params) => renderStatus(params.value),
    },
    {
      field: 'connectivity',
      headerName: 'CONNETCIVITY',
      flex: 1,
      renderCell: (params) => renderStatus(params.value),
    },
    {
      field: 'wsdl',
      headerName: 'WSDL',
      flex: 1,
      renderCell: (params) => renderStatus(params.value),
    },
    {
      field: 'hl7Query',
      headerName: 'HL7 QUERY',
      flex: 1,
      renderCell: (params) => renderStatus(params.value),
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
            Result For Test Reports ({destinations.length})
          </Typography>
        </Card>
      </Box>
      <DataGrid
        sx={dataGridCustom}
        rows={rows}
        columns={columns}
        pageSizeOptions={[5, 25, 50, 100]}
        autoHeight
        initialState={{
          columns: {
            columnVisibilityModel: {
              destTypeId: false,
            },
          },
        }}
        disableRowSelectionOnClick
        disableColumnMenu
        disableColumnSelector
        disableDensitySelector
        getRowId={(row) => row.id}
        getRowClassName={(params) => {
          return params.row.hasActiveMaint === true ? 'highlight' : ''
        }}
        density={'comfortable'}
        pagination
        slots={{
          footer: () => <CustomFooter />,
          toolbar: CustomToolbar as GridSlots['toolbar'],
        }}
      />
      <></>
    </div>
  )
}

export default TestReportTable
