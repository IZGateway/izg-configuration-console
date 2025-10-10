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
import { Box, Typography, Button, IconButton, Tooltip } from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
} from '@mui/icons-material'
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
  '& .MuiTablePagination-root': {
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
    backgroundColor: palette.white,
    borderRadius: '60px',
    margin: '2em 0',
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

interface CustomToolbarProps {
  setFilterButtonEl: React.Dispatch<
    React.SetStateAction<HTMLButtonElement | null>
  >
  onAddToBlacklistClick: () => void
}

const CustomToolbar = ({
  setFilterButtonEl,
  onAddToBlacklistClick,
}: CustomToolbarProps) => {
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
        <Button
          color="primary"
          onClick={onAddToBlacklistClick}
          variant="outlined"
          startIcon={<AddIcon />}
          sx={{
            borderRadius: '24px',
            padding: '8px 16px',
            textTransform: 'none',
            fontWeight: 500,
            '@media (max-width: 768px)': {
              padding: '6px 12px',
              fontSize: '0.75rem',
            },
          }}
        >
          Add to Blacklist
        </Button>
        <GridToolbarFilterButton ref={setFilterButtonEl} />
      </Box>
    </GridToolbarContainer>
  )
}

// Mobile Card Component
const MobileCard = ({ row }) => {
  const actionButtonStyle = {
    borderRadius: 90,
    background: palette.white,
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
    width: 35,
    height: 35,
    '&:hover': {
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.50)',
    },
  }

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
            {row.name}
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
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Tooltip arrow title="Delete">
            <IconButton
              sx={actionButtonStyle}
              size="small"
              color="error"
              onClick={() => console.log('Delete clicked')}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
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
      console.log('setPageSize not available')
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

  const handleAddToBlacklistClick = () => {
    // TODO: Implement add to blacklist functionality
    console.log('Add to blacklist clicked')
  }

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

  const actionButtonStyle = {
    borderRadius: 90,
    background: palette.white,
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
    width: 35,
    height: 35,
    '&:hover': {
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.50)',
    },
  }

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
    {
      field: 'actions',
      headerName: 'ACTIONS',
      sortable: false,
      filterable: false,
      flex: 0.3,
      minWidth: 80,
      maxWidth: 120,
      renderCell: () => (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Tooltip arrow title="Delete">
            <IconButton
              sx={actionButtonStyle}
              size="small"
              color="error"
              onClick={() => console.log('Delete clicked')}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
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

            <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                color="primary"
                onClick={handleAddToBlacklistClick}
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                sx={{
                  borderRadius: '24px',
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                Add to Blacklist
              </Button>
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
        <Box sx={{ mt: -2 }}>
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
              footer: GridFooter as GridSlots['footer'],
            }}
            slotProps={{
              toolbar: {
                setFilterButtonEl,
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
                onAddToBlacklistClick: handleAddToBlacklistClick,
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
