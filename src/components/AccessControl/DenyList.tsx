import React, { useContext, useState } from 'react'
import { DataGrid, GridColDef, GridFooter } from '@mui/x-data-grid'
import { Box, Typography, Button, IconButton, Tooltip } from '@mui/material'
import BlockIcon from '@mui/icons-material/Block'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import palette from '../../styles/theme/palette'
import SessionContext from '../../contexts/app'
import { useSession } from 'next-auth/react'
import CustomDialogBox from '../DialogBox/CustomDialogBox'
import useSWR, { mutate } from 'swr'
import { DenyListItem } from '../../lib/type/DenyList'
import CombinedContext from '../../contexts/app'
import Loader from '../Loader'
import { DEST_TYPES } from '../../lib/desttypehelper'
const dataGridCustom = {
  '&.MuiDataGrid-root.MuiDataGrid-autoHeight.MuiDataGrid-root--densityComfortable':
    {
      marginTop: '-7px',
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

const CustomFooter = ({ onAdd, canAdd }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        margin: '2em 0',
        width: '100%',
      }}
    >
      {canAdd ? (
        <Button
          color="primary"
          onClick={onAdd}
          variant="text"
          startIcon={<AddIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: '60px',
            backgroundColor: palette.white,
            boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
            padding: '16px 24px',
          }}
        >
          Add to Deny List
        </Button>
      ) : null}
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
          Certificate Name: {row.certificationName || 'N/A'}
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

interface DenyListComponentProps extends DenyListProps {
  onAddDeny?: () => void
  onDeleteDeny?: (id: string) => void
}

const DenyList: React.FC<DenyListComponentProps> = ({
  onAddDeny,
  onDeleteDeny,
}) => {
  const { data: session } = useSession()
  const { setAlert } = useContext(CombinedContext)
  const isAdminOrIZGOp =
    session?.user?.role === 'IZG Operations' || session?.user?.isAdmin
  const sessionContext = useContext(SessionContext)
  const pageSize = sessionContext?.pageSize || 25
  const setPageSize =
    sessionContext?.setPageSize ||
    (() => {
      // setPageSize not available
    })
  const {
    data: denyListData,
    error: denyListError,
    isLoading: isDenyListLoading,
  } = useSWR<DenyListItem[]>(`/api/denylist`)
  const [searchTerm, setSearchTerm] = useState('')
  const [renderMode, setRenderMode] = useState<
    'mobile' | 'desktop' | 'transitioning'
  >('desktop')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [rowToDelete, setRowToDelete] = useState<DenyListItem | null>(null)
  const [, setIsDeleting] = useState(false)

  // Filter data based on search term
  const filteredData = React.useMemo(() => {
    const dataToFilter = denyListData || []

    if (!searchTerm) return dataToFilter

    return dataToFilter.filter((row) => {
      const searchLower = searchTerm.toLowerCase()
      return (
        row.name?.toLowerCase().includes(searchLower) ||
        row.reason?.toLowerCase().includes(searchLower) ||
        row.deniedBy?.toLowerCase().includes(searchLower)
      )
    })
  }, [denyListData, searchTerm])

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

  if (denyListError) throw new Error()
  if (isDenyListLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px',
          backgroundColor: palette.white,
          borderRadius: '8px',
          boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
          border: `1px solid ${palette.border}`,
          margin: '16px 0',
        }}
      >
        <Typography variant="body1" color="text.secondary">
          <Loader open={true} />
        </Typography>
      </Box>
    )
  }

  // Call parent handler for add
  const handleAdd = () => {
    if (onAddDeny) onAddDeny()
  }

  const handleDelete = (row) => {
    setRowToDelete(row)
    setDeleteDialogOpen(true)
  }
  const handleConfirmDelete = async () => {
    if (!rowToDelete) {
      setDeleteDialogOpen(false)
      return
    }

    try {
      setIsDeleting(true)
      let envNum = rowToDelete.environment
      if (typeof envNum === 'string') {
        envNum = DEST_TYPES.indexOf(envNum)
      }
      const sortKey = `${envNum}#${rowToDelete.certificationName}`

      const response = await fetch(
        `/api/denylist/${encodeURIComponent(sortKey)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete deny list entry')
      }

      setAlert({
        level: 'success',
        jurisdiction: '',
        dest_type: '',
        message: `Deny list entry has been successfully deleted.`,
      })

      onDeleteDeny(rowToDelete.id)

      mutate('/api/denylist')
    } catch (error) {
      console.error('Error deleting deny list entry:', error)
      setAlert({
        level: 'error',
        jurisdiction: '',
        dest_type: '',
        message: `Failed to delete entry. Please try again.`,
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setRowToDelete(null)
    }
  }
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setRowToDelete(null)
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
      field: 'certificationName',
      headerName: 'CERTIFICATE NAME',
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
              params.value === 'PRODUCTION' ? 'success.main' : 'warning.main',
          }}
        >
          {params.value || 'Undefined'}
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
          {params.value || 'Not specified'}
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
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) =>
        isAdminOrIZGOp ? (
          <Tooltip arrow title="Delete">
            <IconButton
              size="small"
              color="error"
              sx={{
                borderRadius: 90,
                background: palette.white,
                boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
                width: 35,
                height: 35,
              }}
              onClick={() => handleDelete(params.row)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null,
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
        <Box>
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
            getRowId={(row) => row.id || row.principal || row.sortKey}
            density={'comfortable'}
            pagination
            slots={{
              footer: () => (
                <CustomFooter onAdd={handleAdd} canAdd={isAdminOrIZGOp} />
              ),
            }}
            slotProps={{
              panel: {
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
        titleText="Delete Deny List Entry"
        content={
          <>
            <Typography
              sx={{ color: 'text.primary', fontSize: '1rem', lineHeight: 1.6 }}
            >
              Are you sure you want to delete the denied item &quot;
              <Box component="span" sx={{ fontWeight: 600 }}>
                {rowToDelete?.name}
              </Box>
              &quot;?
            </Typography>
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: '0.875rem',
                mt: 2,
                lineHeight: 1.5,
              }}
            >
              This action cannot be undone. Please confirm that you want to
              proceed with this deletion.
            </Typography>
          </>
        }
        actions={
          <Button
            onClick={handleConfirmDelete}
            variant="outlined"
            color="error"
            sx={{ textTransform: 'none' }}
          >
            Delete
          </Button>
        }
      />
    </>
  )
}

export default DenyList
