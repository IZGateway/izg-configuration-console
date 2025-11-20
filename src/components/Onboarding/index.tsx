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
  WifiOff as WifiOffIcon,
  Wifi as WifiIcon,
} from '@mui/icons-material'
import { useSession } from 'next-auth/react'
import SessionContext from '../../contexts/app'
import palette from '../../styles/theme/palette'
import { mockSenderData, type SenderData } from './mockData'
import type {
  AllowedUser,
  SerializedAllowedUser,
} from '../../lib/type/AllowedUser'
import EditSender from './EditSender'
import AddSender from './AddSender'
import StatusPromoteDemote from './StatusPromoteDemote'
import CustomSnackbar from '../SnackBar'
import CustomDialogBox from '../DialogBox/CustomDialogBox'

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
    borderLeft: `1px solid ${palette.border}`,
    borderRight: `1px solid ${palette.border}`,
    borderTop: `1px solid ${palette.border}`,
    borderBottom: 'none',
    paddingBottom: '1em',
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
    overflowX: 'auto',
  },
  // Remove top border from the DataGrid footer container
  '& .MuiDataGrid-footerContainer': {
    borderTop: 'none',
    justifyContent: 'flex-end',
  },
  '& .MuiDataGrid-row:hover': {
    bgcolor: '#00000010',
  },
  // Remove bottom border from the last row
  '& .MuiDataGrid-row:last-of-type .MuiDataGrid-cell': {
    borderBottom: 'none',
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
}

const CustomToolbar = ({ setFilterButtonEl }: CustomToolbarProps) => {
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

interface OnboardSenderProps {
  data?: SenderData[]
  allowedUsers?: SerializedAllowedUser[]
  error?: string
}

const OnboardSender: React.FC<OnboardSenderProps> = ({
  data = [],
  allowedUsers = [],
  error,
}) => {
  const { pageSize, setPageSize } = useContext(SessionContext)
  const { data: session } = useSession()
  const [filterButtonEl, setFilterButtonEl] =
    React.useState<HTMLButtonElement | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [renderMode, setRenderMode] = useState<
    'mobile' | 'desktop' | 'transitioning'
  >('desktop')

  // Edit state management
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingSender, setEditingSender] = useState<SenderData | null>(null)

  // Add mode state management
  const [isAddMode, setIsAddMode] = useState(false)

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [senderToDelete, setSenderToDelete] = useState<SenderData | null>(null)

  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    'success' | 'error' | 'warning' | 'info'
  >('success')

  // Sender data state management
  const [senderData, setSenderData] = useState<SenderData[]>(() => {
    // Use allowedUsers if provided, otherwise use data prop, finally fall back to mockData
    if (allowedUsers.length > 0) {
      return mapAllowedUsersToSenderData(allowedUsers)
    } else if (data.length > 0) {
      return data
    } else {
      return mockSenderData
    }
  })

  // Function to map AllowedUser data to SenderData format
  function mapAllowedUsersToSenderData(
    users: SerializedAllowedUser[]
  ): SenderData[] {
    return users.map((user) => ({
      id: `${user.environment}-${user.destinationId}-${user.principal}`,
      sender: user.organization || user.principal,
      senderDetails: user.principal,
      destination: `${user.destinationId} (${getEnvironmentName(
        user.environment
      )})`,
      destinationCode: user.destinationId.toUpperCase(),
      accessLevel: user.enabled ? 'Full Access' : 'Restricted',
      status: user.enabled ? 'Production Live' : 'Disabled',
      lastUpdated: new Date(user.updatedOn).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      }),
      connectionType: getConnectionType(user.environment),
      isConnected: user.enabled,
      msh3: '', // Not available in AllowedUser data
      msh4: '', // Not available in AllowedUser data
      facilityId: user.destinationId,
    }))
  }

  // Helper function to get environment name
  function getEnvironmentName(envId: number): string {
    const envMap: { [key: number]: string } = {
      1: 'PRODUCTION',
      2: 'TEST',
      3: 'ONBOARD',
      4: 'STAGE',
      5: 'DEV',
      6: 'UNKNOWN',
    }
    return envMap[envId] || 'Unknown'
  }

  // Helper function to determine connection type
  function getConnectionType(envId: number): 'production' | 'onboarding' {
    return envId === 1 ? 'production' : 'onboarding'
  }

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

  // Sync sender data when props change
  React.useEffect(() => {
    if (data.length > 0) {
      setSenderData(data)
    }
  }, [data])

  const handleAddSenderClick = () => {
    setIsAddMode(true)
  }

  const handleWifiToggle = (senderId: string) => {
    const sender = senderData.find((s) => s.id === senderId)
    setSenderData((prevData) =>
      prevData.map((sender) => {
        if (sender.id === senderId) {
          const newConnectionState = !sender.isConnected
          return { ...sender, isConnected: newConnectionState }
        }
        return sender
      })
    )

    // Show snackbar notification
    if (sender) {
      const action = sender.isConnected ? 'disconnected from' : 'connected to'
      setSnackbarMessage(
        `Sender "${sender.sender}" has been ${action} the system.`
      )
      setSnackbarSeverity('success')
      setSnackbarOpen(true)
    }
  }

  const handleEditSender = (senderId: string) => {
    const senderToEdit = senderData.find((sender) => sender.id === senderId)
    if (senderToEdit) {
      setEditingSender(senderToEdit)
      setIsEditMode(true)
    }
  }

  const handleSaveEdit = (updatedSender: SenderData) => {
    // Update the sender data state with the edited information
    setSenderData((prevData) =>
      prevData.map((sender) =>
        sender.id === updatedSender.id ? updatedSender : sender
      )
    )

    // Show snackbar notification
    setSnackbarMessage(
      `Sender "${updatedSender.sender}" has been successfully updated.`
    )
    setSnackbarSeverity('success')
    setSnackbarOpen(true)

    setIsEditMode(false)
    setEditingSender(null)
  }

  const handleSaveAdd = async (newSender: SenderData) => {
    try {
      const environment = 5 // TODO: Determine environment dynamically based on destination type

      // Create AllowedUser object from SenderData
      const allowedUser = {
        principal: newSender.senderDetails,
        environment: environment,
        destinationId: newSender.destinationCode,
        organization: newSender.sender,
        enabled: newSender.isConnected,
        createdBy: session?.user?.email || 'unknown',
        updatedBy: session?.user?.email || 'unknown',
        // validatedOn logic: null while validating, timestamp when ready
        validatedOn:
          newSender.status === 'ready' ? new Date().toISOString() : null,
      }

      // Call the API to add the allowed user
      const response = await fetch('/api/allowedusers', {
        method: 'POST',
        body: JSON.stringify(allowedUser),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API error response:', errorData)
        throw new Error('Failed to add allowed user')
      }

      const result = await response.json()

      // Add the new sender to the sender data state
      setSenderData((prevData) => [...prevData, newSender])

      // Show snackbar notification
      setSnackbarMessage(
        `Sender "${newSender.sender}" has been successfully added to onboarding.`
      )
      setSnackbarSeverity('success')
      setSnackbarOpen(true)

      setIsAddMode(false)
      setEditingSender(null)
    } catch (error) {
      console.error('Error adding sender:', error)
      setSnackbarMessage(
        `Failed to add sender "${newSender.sender}". Please try again.`
      )
      setSnackbarSeverity('error')
      setSnackbarOpen(true)
    }
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    setIsAddMode(false)
    setEditingSender(null)
  }

  // Filter data based on search term
  const filteredData = React.useMemo(() => {
    if (!searchTerm) return senderData

    return senderData.filter((row) => {
      const searchLower = searchTerm.toLowerCase()
      return (
        row.sender?.toLowerCase().includes(searchLower) ||
        row.destination?.toLowerCase().includes(searchLower) ||
        row.status?.toLowerCase().includes(searchLower) ||
        row.destinationCode?.toLowerCase().includes(searchLower) ||
        row.senderDetails?.toLowerCase().includes(searchLower)
      )
    })
  }, [senderData, searchTerm])

  const actionButtonStyle = {
    borderRadius: 90,
    background: palette.white,
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
    width: 35,
    height: 35,
    marginRight: 2,
  }

  const handleStatusUpdate = (senderId: string, newStatus: string) => {
    const sender = senderData.find((s) => s.id === senderId)
    setSenderData((prevData) =>
      prevData.map((sender) => {
        if (sender.id === senderId) {
          return { ...sender, status: newStatus }
        }
        return sender
      })
    )

    // Show snackbar notification
    if (sender) {
      setSnackbarMessage(
        `Sender "${sender.sender}" status updated to "${newStatus}".`
      )
      setSnackbarSeverity('success')
      setSnackbarOpen(true)
    }
  }

  const handleDeleteSender = (senderId: string) => {
    const sender = senderData.find((s) => s.id === senderId)
    if (sender) {
      setSenderToDelete(sender)
      setDeleteDialogOpen(true)
    }
  }

  const handleConfirmDelete = () => {
    if (senderToDelete) {
      setSenderData((prevData) =>
        prevData.filter((sender) => sender.id !== senderToDelete.id)
      )
      setSnackbarMessage(
        `Sender "${senderToDelete.sender}" has been permanently deleted from onboarding.`
      )
      setSnackbarSeverity('success')
      setSnackbarOpen(true)
      setDeleteDialogOpen(false)
      setSenderToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setSenderToDelete(null)
  }

  const handleSnackbarClose = () => {
    setSnackbarOpen(false)
  }

  // DataGrid columns definition
  const columns: GridColDef<SenderData>[] = [
    {
      field: 'sender',
      headerName: 'SENDERS',
      flex: 0.5,
      minWidth: 100,
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
      field: 'lastUpdated',
      headerName: 'LAST UPDATED',
      flex: 0.3,
      minWidth: 80,
      renderCell: (params) => (
        <Typography variant="body2">{params.row.lastUpdated}</Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'STATUS',
      flex: 0.3,
      minWidth: 120,
      renderCell: (params) => {
        return (
          <StatusPromoteDemote
            sender={params.row}
            onStatusChange={handleStatusUpdate}
            size="small"
          />
        )
      },
    },
    {
      field: 'action',
      headerName: 'ACTION',
      sortable: false,
      filterable: false,
      flex: 0.3,
      minWidth: 120,
      maxWidth: 350,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip arrow title="Edit">
            <IconButton
              sx={actionButtonStyle}
              size="small"
              color="primary"
              onClick={() => handleEditSender(params.row.id)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip
            arrow
            title={params.row.isConnected ? 'Disconnect' : 'Connect'}
          >
            <IconButton
              sx={actionButtonStyle}
              size="small"
              color="secondary"
              onClick={() => handleWifiToggle(params.row.id)}
            >
              {params.row.isConnected ? (
                <WifiIcon color="secondary" fontSize="small" />
              ) : (
                <WifiOffIcon
                  sx={{ color: palette.secondaryDark }}
                  fontSize="small"
                />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip arrow title="Delete">
            <IconButton
              sx={actionButtonStyle}
              size="small"
              color="error"
              onClick={() => handleDeleteSender(params.row.id)}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ]

  // Mobile Card Component
  const MobileCard = React.memo(({ row }: { row: SenderData }) => {
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
              color: 'textPrimary',
              fontSize: '1rem',
            }}
          >
            {row.sender}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <StatusPromoteDemote
              sender={row}
              onStatusChange={handleStatusUpdate}
              size="small"
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
            <strong>Last Updated:</strong> {row.lastUpdated}
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
          <IconButton
            size="small"
            color="primary"
            sx={actionButtonStyle}
            onClick={() => handleEditSender(row.id)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            sx={actionButtonStyle}
            size="small"
            onClick={() => handleWifiToggle(row.id)}
          >
            {row.isConnected ? (
              <WifiIcon color="secondary" fontSize="small" />
            ) : (
              <WifiOffIcon
                sx={{ color: palette.secondaryDark }}
                fontSize="small"
              />
            )}
          </IconButton>
          <IconButton
            size="small"
            color="error"
            sx={actionButtonStyle}
            onClick={() => handleDeleteSender(row.id)}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    )
  })

  MobileCard.displayName = 'MobileCard'

  // Custom Footer with Add Button
  const CustomFooterWithButton = () => {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <Box
          sx={{
            backgroundColor: 'white',
            padding: '8px',
            boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
            borderRadius: '64px',
          }}
        >
          <Button
            color="primary"
            onClick={handleAddSenderClick}
            variant="text"
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
        <GridFooter />
      </Box>
    )
  }

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

  // Show AddSender component when in add mode
  if (isAddMode) {
    return <AddSender onSave={handleSaveAdd} onCancel={handleCancelEdit} />
  }

  // Show EditSender component when in edit mode
  if (isEditMode && editingSender) {
    return (
      <EditSender
        senderData={editingSender}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
        isAddMode={false}
      />
    )
  }

  return (
    <>
      {/* Page Header */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 10,
          height: 'auto',
          boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
          marginBottom: '16px',
          backgroundColor: palette.white,
          borderRadius: '4px',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            padding: 2,
          }}
        >
          <Typography
            id="title-table"
            sx={{ fontSize: '1.75rem', fontWeight: 700 }}
            flexGrow={1}
          >
            Onboard Senders
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: palette.grey,
            }}
          >
            Manage and onboard new senders to the IZ Gateway system. View sender
            status, destinations, and access levels.
          </Typography>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Box
          sx={{
            marginBottom: '16px',
            padding: '16px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
          }}
        >
          <Typography variant="body1" sx={{ color: '#856404' }}>
            ⚠️ {error}
          </Typography>
        </Box>
      )}

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
              mt: -3,
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
          </Box>

          {/* Mobile Cards */}
          <Box sx={{ padding: '0 8px' }}>
            {filteredData.map((row) => (
              <MobileCard key={row.id} row={row} />
            ))}
          </Box>

          {/* Mobile Add Button */}
          <Box
            sx={{
              padding: '16px',
              display: 'flex',
              justifyContent: 'center',
              marginTop: '16px',
            }}
          >
            <Button
              color="primary"
              onClick={handleAddSenderClick}
              variant="outlined"
              startIcon={<AddIcon />}
              sx={{
                borderRadius: '24px',
                padding: '12px 24px',
                textTransform: 'none',
                fontWeight: 500,
              }}
            >
              Add Sender
            </Button>
          </Box>
        </Box>
      ) : (
        /* Desktop DataGrid */
        <Box sx={{ mt: -5 }}>
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
              footer: CustomFooterWithButton as GridSlots['footer'],
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

      {/* Delete Confirmation Dialog */}
      <CustomDialogBox
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        maxWidth="sm"
        fullWidth
        titleText="Confirm Delete Sender"
        showCloseIcon={true}
        content={
          <>
            <Typography variant="body1" sx={{ marginBottom: 2 }}>
              Are you sure you want to permanently delete this sender from
              onboarding? This action cannot be undone.
            </Typography>
            {senderToDelete && (
              <Box
                sx={{
                  backgroundColor: palette.grey[50],
                  padding: 2,
                  borderRadius: 1,
                  border: `1px solid ${palette.border}`,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, marginBottom: 1 }}
                >
                  Sender Details:
                </Typography>
                <Typography variant="body2">
                  <strong>Sender:</strong> {senderToDelete.sender}
                </Typography>
                <Typography variant="body2">
                  <strong>Sender Details:</strong>{' '}
                  {senderToDelete.senderDetails}
                </Typography>
                <Typography variant="body2">
                  <strong>Destination:</strong> {senderToDelete.destination}
                </Typography>
                <Typography variant="body2">
                  <strong>Status:</strong> {senderToDelete.status}
                </Typography>
              </Box>
            )}
          </>
        }
        actions={
          <Button
            onClick={handleConfirmDelete}
            variant="outlined"
            color="error"
            sx={{
              borderRadius: '24px',
              padding: '8px 24px',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: 'rgba(211, 47, 47, 0.04)',
              },
            }}
          >
            Delete Permanently
          </Button>
        }
      />

      {/* Snackbar for notifications */}
      <CustomSnackbar
        open={snackbarOpen}
        severity={snackbarSeverity}
        message={snackbarMessage}
        onClose={handleSnackbarClose}
      />
    </>
  )
}
export default OnboardSender
