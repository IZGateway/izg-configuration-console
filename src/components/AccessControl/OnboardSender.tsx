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
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  CircularProgress,
  Tooltip,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteOutlineIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pause as PauseIcon,
} from '@mui/icons-material'
import SessionContext from '../../contexts/app'
import palette from '../../styles/theme/palette'
import { mockSenderData, type SenderData } from './mockData'

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
  onAddSenderClick: () => void
}

const CustomToolbar = ({
  setFilterButtonEl,
  onAddSenderClick,
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
          onClick={onAddSenderClick}
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
          Add Sender
        </Button>
        <GridToolbarFilterButton ref={setFilterButtonEl} />
      </Box>
    </GridToolbarContainer>
  )
}

interface OnboardSenderProps {
  data?: SenderData[]
}

const OnboardSender: React.FC<OnboardSenderProps> = ({ data = [] }) => {
  const { pageSize, setPageSize } = useContext(SessionContext)
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

  const handleAddSenderClick = () => {
    // TODO: Implement add sender functionality
    console.log('Add sender clicked')
  }

  // Filter data based on search term
  const filteredData = React.useMemo(() => {
    const dataToFilter = data.length > 0 ? data : mockSenderData

    if (!searchTerm) return dataToFilter

    return dataToFilter.filter((row) => {
      const searchLower = searchTerm.toLowerCase()
      return (
        row.sender?.toLowerCase().includes(searchLower) ||
        row.destination?.toLowerCase().includes(searchLower) ||
        row.status?.toLowerCase().includes(searchLower) ||
        row.destinationCode?.toLowerCase().includes(searchLower) ||
        row.senderDetails?.toLowerCase().includes(searchLower)
      )
    })
  }, [data, searchTerm])

  const actionButtonStyle = {
    borderRadius: 90,
    background: palette.white,
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
    width: 35,
    height: 35,
    marginRight: 2,
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16 }} />
      case 'draft':
        return <PauseIcon sx={{ color: 'warning.main', fontSize: 16 }} />
      case 'disconnect':
        return <CancelIcon sx={{ color: 'error.main', fontSize: 16 }} />
      default:
        return null
    }
  }

  const getStatusColor = (
    status: string
  ): 'success' | 'warning' | 'error' | 'default' => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'success'
      case 'draft':
        return 'warning'
      case 'disconnect':
        return 'error'
      default:
        return 'default'
    }
  }

  // DataGrid columns definition
  const columns: GridColDef[] = [
    {
      field: 'sender',
      headerName: 'SENDERS',
      flex: 0.5,
      minWidth: 200,
      maxWidth: 300,
      renderCell: (params) => (
        <Box display={'flex'} flexDirection="column" gap={0.5}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {params.row.sender}
          </Typography>
          <Typography
            fontFamily="monospace"
            variant="caption"
            color="text.secondary"
          >
            {params.row.senderDetails}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'destination',
      headerName: 'DESTINATIONS',
      flex: 0.5,
      minWidth: 200,
      maxWidth: 300,
      renderCell: (params) => (
        <Box display={'flex'} flexDirection="column" gap={0.5}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {params.row.destination}
          </Typography>
          <Chip
            label={params.row.destinationCode}
            size="small"
            variant="outlined"
            sx={{ mt: 0.5, maxWidth: 'fit-content' }}
          />
        </Box>
      ),
    },
    {
      field: 'accessLevel',
      headerName: 'ACCESS LEVEL',
      flex: 0.3,
      minWidth: 120,
      maxWidth: 150,
      renderCell: (params) => (
        <Typography variant="body2">{params.row.accessLevel}</Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'STATUS',
      flex: 0.3,
      minWidth: 120,
      maxWidth: 150,
      renderCell: (params) => {
        const status = params.row.status
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getStatusIcon(status)}
            <Chip
              label={status}
              size="small"
              color={getStatusColor(status)}
              variant="outlined"
            />
          </Box>
        )
      },
    },
    {
      field: 'lastActive',
      headerName: 'LAST ACTIVE',
      flex: 0.3,
      minWidth: 120,
      maxWidth: 200,
      renderCell: (params) => (
        <Typography variant="body2">{params.row.lastActive}</Typography>
      ),
    },
    {
      field: 'action',
      headerName: 'ACTION',
      sortable: false,
      filterable: false,
      flex: 0.3,
      minWidth: 120,
      maxWidth: 350,
      renderCell: () => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip arrow title="Edit">
            <IconButton sx={actionButtonStyle} size="small" color="primary">
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip arrow title="Delete">
            <IconButton sx={actionButtonStyle} size="small" color="error">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip arrow title="More options">
            <IconButton
              sx={actionButtonStyle}
              size="small"
              color="secondary"
              onClick={() => console.log('More options clicked')}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ]

  // Mobile Card Component
  const MobileCard = React.memo(
    ({
      row,
    }: {
      row: {
        id: string
        sender: string
        senderDetails: string
        destination: string
        destinationCode: string
        accessLevel: string
        status: string
        lastActive: string
      }
    }) => {
      return (
        <Box
          sx={{
            marginBottom: '12px',
            padding: '16px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            backgroundColor: 'white',
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Header Row */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 'bold',
                color: palette.primary,
                fontSize: '1rem',
              }}
            >
              {row.sender}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {getStatusIcon(row.status)}
              <Chip
                label={row.status}
                size="small"
                color={getStatusColor(row.status)}
                variant="outlined"
              />
            </Box>
          </Box>

          {/* Content */}
          <Box sx={{ marginBottom: '12px' }}>
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ marginBottom: '4px' }}
            >
              <strong>Sender Details:</strong> {row.senderDetails}
            </Typography>
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ marginBottom: '4px' }}
            >
              <strong>Destination:</strong> {row.destination}
            </Typography>
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ marginBottom: '4px' }}
            >
              <strong>Destination Code:</strong> {row.destinationCode}
            </Typography>
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ marginBottom: '4px' }}
            >
              <strong>Access Level:</strong> {row.accessLevel}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              <strong>Last Active:</strong> {row.lastActive}
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Box
            sx={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              justifyContent: 'flex-start',
            }}
          >
            <Button
              size="small"
              startIcon={<EditIcon />}
              variant="outlined"
              color="primary"
              sx={actionButtonStyle}
            >
              Edit
            </Button>
            <Button
              size="small"
              startIcon={<DeleteOutlineIcon />}
              variant="outlined"
              color="error"
              sx={actionButtonStyle}
            >
              Delete
            </Button>
            <IconButton
              sx={actionButtonStyle}
              size="small"
              onClick={() => console.log('More options clicked')}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )
    }
  )

  MobileCard.displayName = 'MobileCard'

  if (renderMode === 'transitioning') {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
        }}
      >
        <CircularProgress size={24} />
        <Typography sx={{ marginLeft: '12px' }}>Loading...</Typography>
      </Box>
    )
  }

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
              {filteredData.length} Senders Found
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
                placeholder="Search senders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${palette.border}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: 'white',
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                color="primary"
                onClick={handleAddSenderClick}
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                sx={{
                  borderRadius: '24px',
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                Add Sender
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
                sortModel: [{ field: 'sender', sort: 'asc' }],
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
                onAddSenderClick: handleAddSenderClick,
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

export default OnboardSender
