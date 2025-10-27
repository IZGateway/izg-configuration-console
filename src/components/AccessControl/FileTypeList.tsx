import React, { useContext, useState, useRef, useEffect } from 'react'
import { DataGrid, GridColDef, GridFooter } from '@mui/x-data-grid'
import { Box, Typography, Button, IconButton, Tooltip } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import palette from '../../styles/theme/palette'
import SessionContext from '../../contexts/app'
import { mockFileTypeListData, type FileTypeListItem } from './mockData'
import { useSession } from 'next-auth/react'
import CustomDialogBox from '../DialogBox/CustomDialogBox'

// Component to handle tooltips for truncated text
const TruncatedTextWithTooltip = ({ 
  value, 
  sx = {}, 
  variant = 'body2' 
}: { 
  value: string | null | undefined
  sx?: React.CSSProperties | object
  variant?: 'body1' | 'body2' | 'caption' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2'
}) => {
  const textRef = useRef<HTMLElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        const isOverflow = textRef.current.scrollWidth > textRef.current.clientWidth ||
                          textRef.current.scrollHeight > textRef.current.clientHeight
        setIsOverflowing(isOverflow)
      }
    }

    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    return () => window.removeEventListener('resize', checkOverflow)
  }, [value])

  const content = (
    <Typography
      ref={textRef}
      variant={variant}
      sx={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        ...sx
      }}
    >
      {value || 'N/A'}
    </Typography>
  )

  if (isOverflowing && value) {
    return (
      <Tooltip title={value} arrow placement="top">
        {content}
      </Tooltip>
    )
  }

  return content
}

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
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingTop: '8px',
    paddingBottom: '8px',
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
          Add to File Type List
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
          {row.name} ({row.id})
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Description: {row.description }
        </Typography>
      </Box>
    </Box>
  )
}

interface FileTypeListProps {
  data?: FileTypeListItem[]
}

interface FileTypeListComponentProps extends FileTypeListProps {
  onAddFileType?: () => void
  onDeleteFileType?: (id: string) => void
}

const FileTypeList: React.FC<FileTypeListComponentProps> = ({
  data = [],
  onAddFileType,
  onDeleteFileType,
}) => {
  const { data: session } = useSession()
  const isAdminOrIZGOp =
    session?.user?.role === 'IZG Operations' || session?.user?.isAdmin
  const sessionContext = useContext(SessionContext)
  const pageSize = sessionContext?.pageSize || 25
  const setPageSize =
    sessionContext?.setPageSize ||
    (() => {
      // setPageSize not available
    })
  const [searchTerm, setSearchTerm] = useState('')
  const [renderMode, setRenderMode] = useState<
    'mobile' | 'desktop' | 'transitioning'
  >('desktop')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [rowToDelete, setRowToDelete] = useState<FileTypeListItem | null>(null)
  // Derive displayed data from parent prop so updates (add/delete) are reflected
  const fileTypeListData: FileTypeListItem[] =
    data && data.length > 0 ? data : mockFileTypeListData

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
    const dataToFilter = fileTypeListData

    if (!searchTerm) return dataToFilter

    return dataToFilter.filter((row) => {
      const searchLower = searchTerm.toLowerCase()
      return (
        row.name?.toLowerCase().includes(searchLower) ||
        row.description?.toLowerCase().includes(searchLower) ||
        row.id?.toLowerCase().includes(searchLower)
      )
    })
  }, [fileTypeListData, searchTerm])

  // Call parent handler for add
  const handleAdd = () => {
    if (onAddFileType) onAddFileType()
  }

  const handleDelete = (row) => {
    setRowToDelete(row)
    setDeleteDialogOpen(true)
  }
  const handleConfirmDelete = () => {
    // Delegate actual delete to parent so data source stays in sync
    if (rowToDelete && typeof onDeleteFileType === 'function') {
      onDeleteFileType(rowToDelete.id)
    }
    setDeleteDialogOpen(false)
    setRowToDelete(null)
  }
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setRowToDelete(null)
  }

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'FILE TYPE NAME',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, width: '100%', height: '100%' }}>
          <TruncatedTextWithTooltip 
            value={params.value} 
            sx={{ fontWeight: 500 }}
            variant="body2"
          />
        </Box>
      ),
    },
    {
      field: 'id',
      headerName: 'FILE TYPE ID',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', height: '100%' }}>
          <TruncatedTextWithTooltip 
            value={params.value} 
            sx={{ fontWeight: 500 }}
            variant="body2"
          />
        </Box>
      ),
    },
    {
      field: 'description',
      headerName: 'DESCRIPTION',
      flex: 1,
      minWidth: 600,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', height: '100%' }}>
          <TruncatedTextWithTooltip 
            value={params.value} 
            sx={{ 
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              lineHeight: 1.4,
              padding: '8px 0'
            }}
            variant="body2"
          />
        </Box>
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
              {filteredData.length} File Type Items Found
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
                placeholder="Search file type items..."
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
            getRowHeight={() => 'auto'}
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
              Are you sure you want to delete the file type &quot;
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

export default FileTypeList
