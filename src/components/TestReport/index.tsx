import React from 'react'
import {
  DataGrid,
  GridFooter,
  GridSlots,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarQuickFilter,
} from '@mui/x-data-grid'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { Box, Typography, Card, Chip, Button, Tooltip } from '@mui/material'
import palette from '../../styles/theme/palette'
import router from 'next/router'
import Cookies from 'js-cookie'
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

const renderStatus = (value, tooltipText) => {
  let color
  const label = value === 'SKIPPED' ? 'N/A' : value
  let icon = null

  if (value === 'PASS') {
    color = 'primary'
  } else if (value === 'WARNING') {
    color = 'warning'
    icon = <ReportProblemIcon fontSize="small" />
  } else if (value === 'FAIL') {
    color = 'error'
    icon = <ErrorOutlineIcon fontSize="small" />
  }
  const chip = (
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

  return value === 'PASS' ? (
    chip
  ) : (
    <Tooltip title={tooltipText} arrow>
      {chip}
    </Tooltip>
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
  Cookies.remove('destination')
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
  console.log(destinationDetails)
  const rows = destinationDetails.map((dest) => {
    const result = connectionTestResults.find(
      (testResult) =>
        testResult.destId === dest.destId && testResult.destType === dest.type
    )
    return {
      id: dest.destId + dest.destTypeId,
      jurisdiction: dest?.jurisdiction || 'N/A',
      destination: dest.destId,
      environment: result?.destType || 'N/A',
      dnsLookup: result?.dns || 'N/A',
      dnsDetail: result?.dnsDetail || 'No details available',
      tcpConnectivity: result?.tcp || 'N/A',
      tcpDetail: result?.tcpDetail || 'No details available',
      tlsVersion: result?.tls || 'N/A',
      tlsDetail: result?.tlsDetail || 'No details available',
      cipherSuites: result?.cipher || 'N/A',
      cipherDetail: result?.cipherDetail || 'No details available',
      wsdl: result?.wsdl || 'N/A',
      wsdlDetail: result?.wsdlDetail || 'No details available',
      connectivity: result?.connectivity || 'N/A',
      connectivityDetail: result?.connectivityDetail || 'No details available',
      hl7Query: result?.hl7 || 'N/A',
      hl7Detail: result?.hl7Detail || 'No details available',
    }
  })
  const columns = [
    { field: 'jurisdiction', headerName: 'JURISDICTION', flex: 1 },
    { field: 'destination', headerName: 'DESTINATION', flex: 1 },
    { field: 'environment', headerName: 'ENVIRONMENT', flex: 1 },
    {
      field: 'dnsLookup',
      headerName: 'DNS LOOKUP',
      flex: 1,
      renderCell: (params) => renderStatus(params.value, params.row.dnsDetail),
    },
    {
      field: 'tcpConnectivity',
      headerName: 'TCP CONNECTIVITY',
      flex: 1,
      renderCell: (params) => renderStatus(params.value, params.row.tcpDetail),
    },
    {
      field: 'tlsVersion',
      headerName: 'TLS VERSION',
      flex: 1,
      renderCell: (params) => renderStatus(params.value, params.row.tlsDetail),
    },
    {
      field: 'cipherSuites',
      headerName: 'CIPHER SUITES',
      flex: 1,
      renderCell: (params) =>
        renderStatus(params.value, params.row.cipherDetail),
    },
    {
      field: 'connectivity',
      headerName: 'CONNETCIVITY',
      flex: 1,
      renderCell: (params) =>
        renderStatus(params.value, params.row.connectivityDetail),
    },
    {
      field: 'wsdl',
      headerName: 'WSDL',
      flex: 1,
      renderCell: (params) => renderStatus(params.value, params.row.wsdlDetail),
    },
    {
      field: 'hl7Query',
      headerName: 'HL7 QUERY',
      flex: 1,
      renderCell: (params) => renderStatus(params.value, params.row.hl7Detail),
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
