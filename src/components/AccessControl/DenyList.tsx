import React, { useContext, useState } from 'react'
import {
  DataGrid,
  GridColDef,
  GridFooter,
  GridSlots,
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarQuickFilter,
} from '@mui/x-data-grid'
import { Box, Typography } from '@mui/material'
import BlockIcon from '@mui/icons-material/Block'
import palette from '../../styles/theme/palette'
import SessionContext from '../../contexts/app'
import { mockDenyListData, type DenyListItem } from './mockData'

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
    overflowX: 'auto',
  },
  '& .MuiDataGrid-row:hover': {
    bgcolor: '#00000010',
  },
  '& .MuiFormControl-root.MuiTextField-root.css-3be3ve-MuiFormControl-root-MuiTextField-root-MuiDataGrid-toolbarQuickFilter':
    {
      width: '32vw',
      '@media (max-width: 768px)': {
        width: '100%',
        maxWidth: '200px',
      },
    },
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: palette.white,
    '& .MuiDataGrid-columnHeaderTitle': {
      fontSize: '0.75rem',
      fontWeight: 600,
      '@media (max-width: 768px)': {
        fontSize: '0.65rem',
      },
    },
  },
  '& .MuiDataGrid-cell': {
    alignContent: 'center',
    '@media (max-width: 768px)': {
      fontSize: '0.75rem',
      padding: '4px 8px',
      display: 'flex',
      alignItems: 'center',
    },
  },
  '& .MuiDataGrid-toolbarContainer': {
    backgroundColor: palette.white,
    padding: '24px 16px 16px 16px',
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
    border: `1px solid ${palette.border}`,
    marginBottom: '8px',
    '@media (max-width: 768px)': {
      padding: '16px 12px 12px 12px',
      flexDirection: 'column',
      gap: '8px',
      alignItems: 'stretch',
    },
  },
  '& .MuiDataGrid-footerContainer': {
    justifyContent: 'flex-end',
  },
  '& .MuiTablePagination-actions': {
    color: palette.primary,
  },
  '& .MuiDataGrid-virtualScroller': {
    overflow: 'hidden',
  },
  '& .MuiDataGrid-selectedRowCount': {
    visibility: 'hidden',
    width: 0,
    marginLeft: '-8px',
  },
}

const CustomFooter = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '16px',
        margin: '2em 0',
      }}
    >
      {/* Pagination Box */}
      <Box
        sx={{
          backgroundColor: palette.white,
          borderRadius: '60px',
          boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
        }}
      >
        <GridFooter />
      </Box>
    </Box>
  )
}

const CustomToolbar = ({
  setFilterButtonEl,
}: {
  setFilterButtonEl: React.Dispatch<
    React.SetStateAction<HTMLButtonElement | null>
  >
}) => {
  return (
    <GridToolbarContainer>
      <GridToolbarQuickFilter />
      <Box
        sx={{
          marginLeft: 'auto',
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
          '@media (max-width: 768px)': {
            flexDirection: 'column',
          },
        }}
      >
        <GridToolbarFilterButton ref={setFilterButtonEl} />
      </Box>
    </GridToolbarContainer>
  )
}

// Mobile Card Component
const MobileCard = ({ row }) => {
  return (
    <Box
      sx={{
        padding: '16px',
        boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
        border: `1px solid ${palette.border}`,
        marginBottom: '16px',
        borderRadius: '8px',
        backgroundColor: palette.white,
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
          {row.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Certification Name: {row.certificationName || 'N/A'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Environment: {row.environment || 'Onboarding'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Reason: {row.reason}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Date Denied: {row.dateDenied}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Denied By: {row.deniedBy}
        </Typography>
      </Box>
    </Box>
  )
}

interface DenyListProps {
  data?: DenyListItem[]
}

const DenyList: React.FC<DenyListProps> = ({ data = [] }) => {
  const sessionContext = useContext(SessionContext)
  const pageSize = sessionContext?.pageSize || 25
  const setPageSize =
    sessionContext?.setPageSize ||
    (() => {
      // setPageSize not available
    })
  const [filterButtonEl, setFilterButtonEl] =
    React.useState<HTMLButtonElement | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [renderMode, setRenderMode] = useState<
    'mobile' | 'desktop' | 'transitioning'
  >('desktop')

  // Handle responsive design
  React.useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 992
      setRenderMode(newIsMobile ? 'mobile' : 'desktop')
    }

    handleResize() // Set initial value
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Filter data based on search term
  const filteredData = React.useMemo(() => {
    const dataToFilter = data.length > 0 ? data : mockDenyListData

    if (!searchTerm) return dataToFilter

    return dataToFilter.filter((row) => {
      const searchLower = searchTerm.toLowerCase()
      return (
        row.name?.toLowerCase().includes(searchLower) ||
        row.reason?.toLowerCase().includes(searchLower) ||
        row.deniedBy?.toLowerCase().includes(searchLower)
      )
    })
  }, [data, searchTerm])

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'NAME',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BlockIcon sx={{ color: 'error.main', fontSize: 18 }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'certificationName',
      headerName: 'CERTIFICATION NAME',
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {params.value || 'N/A'}
        </Typography>
      ),
    },
    {
      field: 'environment',
      headerName: 'ENVIRONMENT',
      flex: 1,
      minWidth: 140,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color:
              params.value === 'Production' ? 'success.main' : 'warning.main',
          }}
        >
          {params.value || 'Onboarding'}
        </Typography>
      ),
    },
    {
      field: 'reason',
      headerName: 'REASON',
      flex: 2,
      minWidth: 250,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'dateDenied',
      headerName: 'DATE DENIED',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Typography variant="body2">{params.value}</Typography>
      ),
    },
    {
      field: 'deniedBy',
      headerName: 'DENIED BY',
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {params.value}
        </Typography>
      ),
    },
  ]

  return (
    <>
      {renderMode === 'mobile' ? (
        <Box>
          {/* Mobile Toolbar */}
          <Box
            sx={{
              padding: '16px',
              boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
              border: `1px solid ${palette.border}`,
              marginBottom: '16px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {filteredData.length} Denied Items Found
            </Typography>

            {/* Search Input */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <input
                type="text"
                placeholder="Search denied items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '12px',
                  border: `1px solid ${palette.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: 'white',
                }}
              />
            </Box>
          </Box>

          {/* Mobile Cards */}
          <Box sx={{ padding: '0 8px' }}>
            {filteredData.map((row) => (
              <MobileCard key={row.id} row={row} />
            ))}
          </Box>
        </Box>
      ) : (
        /* Desktop DataGrid */
        <Box sx={{ mt: -1.8 }}>
          <DataGrid
            sx={dataGridCustom}
            rows={filteredData}
            columns={columns}
            pageSizeOptions={[5, 25, 50, 100]}
            autoHeight
            initialState={{
              sorting: {
                sortModel: [{ field: 'name', sort: 'asc' }],
              },
              pagination: { paginationModel: { pageSize: pageSize } },
            }}
            disableRowSelectionOnClick
            disableColumnMenu
            disableColumnSelector
            disableDensitySelector
            onPaginationModelChange={(model) => setPageSize(model.pageSize)}
            getRowId={(row) => row.id}
            density={'comfortable'}
            pagination
            slots={{
              toolbar: CustomToolbar as GridSlots['toolbar'],
              footer: () => <CustomFooter />,
            }}
            slotProps={{
              toolbar: {
                setFilterButtonEl,
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
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
                    width: '100%',
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
        </Box>
      )}
    </>
  )
}

export default DenyList
