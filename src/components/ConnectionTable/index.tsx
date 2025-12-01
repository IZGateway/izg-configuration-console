import React, {
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react'
import {
  DataGrid,
  GridColDef,
  GridFooter,
  GridFooterContainer,
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarQuickFilter,
  GridRenderCellParams,
  GridToolbarProps,
} from '@mui/x-data-grid'
import {
  Box,
  Typography,
  Card,
  Tooltip,
  CardHeader,
  CardContent,
  Button,
  CircularProgress,
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

// ConnectionTable column width persistence
// Storage: localStorage key 'izg-cc-connectiontable-columns'
// Format: { destId: 150, destType: 100, ... }
// Scope: Per-device/browser (no cross-device sync)
// Versioning: Future schema changes should migrate or clear old data

const STORAGE_KEY = 'izg-cc-connectiontable-columns'

interface ColumnWidthState {
  destId?: number
  destType?: number
  jurisdictionName?: number
  destUri?: number
  status?: number
  action?: number
}

/**
 * Save column widths to localStorage
 * Gracefully handles localStorage errors (quota exceeded, disabled, etc.)
 */
const saveColumnWidths = (widths: ColumnWidthState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths))
  } catch (error) {
    console.warn('Failed to save column widths to localStorage:', error)
    // Non-critical error - continue without persistence
  }
}

/**
 * Load column widths from localStorage
 * Returns null if localStorage unavailable or data corrupted
 * Self-healing: automatically clears corrupted data
 */
const loadColumnWidths = (): ColumnWidthState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored)

    // Validate structure
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid column width data structure')
    }

    return parsed as ColumnWidthState
  } catch (error) {
    console.warn('Failed to load column widths from localStorage:', error)
    // Clear corrupted data
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
    return null
  }
}

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
interface CustomToolbarProps extends GridToolbarProps {
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
          color="secondary"
          onClick={onTestReportsClick}
          variant="outlined"
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
          Test Report(s)
        </Button>
        <GridToolbarFilterButton ref={setFilterButtonEl} />
      </Box>
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
  const [isMobile, setIsMobile] = useState(false)
  const [renderMode, setRenderMode] = useState('desktop') // 'mobile', 'desktop', 'transitioning'
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [columnWidths, setColumnWidths] = useState<ColumnWidthState | null>(
    null
  )
  const router = useRouter()

  // Load column widths from localStorage on mount (desktop view only)
  useEffect(() => {
    if (isMobile) return // Skip on mobile view (card layout, not DataGrid)

    const savedWidths = loadColumnWidths()
    if (savedWidths) {
      setColumnWidths(savedWidths)
    }
  }, [isMobile])

  // Debounced function to save column widths to localStorage
  const debouncedSaveWidths = useMemo(
    () =>
      _.debounce((widths: ColumnWidthState) => {
        saveColumnWidths(widths)
      }, 500), // 500ms debounce to avoid excessive writes
    []
  )

  // Cleanup debouncedSaveWidths on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      debouncedSaveWidths.cancel()
    }
  }, [debouncedSaveWidths])
  // Handle responsive design with debounced resize and async rendering
  React.useEffect(() => {
    let resizeTimer

    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        const newIsMobile = window.innerWidth < 992
        if (newIsMobile !== isMobile) {
          // Set transitioning state immediately for smooth UX
          setRenderMode('transitioning')
          setIsMobile(newIsMobile)

          // Delay the actual render mode change to prevent blocking
          setTimeout(() => {
            setRenderMode(newIsMobile ? 'mobile' : 'desktop')
          }, 50) // Small delay to allow state to update
        }
      }, 100) // Debounce resize events
    }

    const initialCheck = () => {
      const initialIsMobile = window.innerWidth < 992
      setIsMobile(initialIsMobile)
      setRenderMode(initialIsMobile ? 'mobile' : 'desktop')
    }

    initialCheck() // Set initial value
    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', handleResize)
    }
  }, [isMobile]) // Debounce search term to improve performance
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300) // 300ms delay

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Filter data based on debounced search term
  const filteredData = React.useMemo(() => {
    if (!debouncedSearchTerm) return endpointStatuses

    return endpointStatuses.filter((row) => {
      const searchLower = debouncedSearchTerm.toLowerCase()
      return (
        row.destId?.toLowerCase().includes(searchLower) ||
        row.jurisdictionName?.toLowerCase().includes(searchLower) ||
        row.destType?.toLowerCase().includes(searchLower) ||
        row.destUri?.toLowerCase().includes(searchLower) ||
        row.status?.toLowerCase().includes(searchLower)
      )
    })
  }, [endpointStatuses, debouncedSearchTerm])

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

  // Reusable cell renderer with tooltip for truncated text
  const renderCellWithTooltip = React.useCallback(
    (params: GridRenderCellParams) => (
      <Tooltip title={params.value || ''} arrow placement="top">
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            width: '100%',
          }}
        >
          {params.value}
        </span>
      </Tooltip>
    ),
    []
  )

  const updateRow = useCallback(
    (row) => {
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
    },
    [endpointStatuses, setEndpointStatuses]
  )

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'destId',
        headerName: 'DESTINATION ID',
        ...(columnWidths?.destId
          ? { width: columnWidths.destId }
          : { flex: 0.5 }),
        minWidth: 50,
        renderCell: renderCellWithTooltip,
      },
      {
        field: 'destType',
        headerName: 'ENVIRONMENT',
        ...(columnWidths?.destType
          ? { width: columnWidths.destType }
          : { flex: 0.5 }),
        minWidth: 50,
        renderCell: renderCellWithTooltip,
      },
      {
        field: 'jurisdictionName',
        headerName: 'ORGANIZATION',
        ...(columnWidths?.jurisdictionName
          ? { width: columnWidths.jurisdictionName }
          : { flex: 0.5 }),
        minWidth: 25,
        renderCell: renderCellWithTooltip,
      },
      {
        field: 'destUri',
        headerName: 'ENDPOINT URL',
        ...(columnWidths?.destUri
          ? { width: columnWidths.destUri }
          : { flex: 0.5 }),
        minWidth: 50,
        renderCell: renderCellWithTooltip,
      },
      {
        field: 'status',
        headerName: 'STATUS',
        ...(columnWidths?.status
          ? { width: columnWidths.status }
          : { flex: 0.75 }),
        minWidth: 50,
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
                        <Box
                          sx={{ fontWeight: 'regular', marginBottom: '8px' }}
                        >
                          {params.row.detail}
                        </Box>
                        <Box sx={{ fontWeight: 'bold' }}>Diagnostics:</Box>
                        <Box
                          sx={{ fontWeight: 'regular', marginBottom: '8px' }}
                        >
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
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mt: isMobile ? 0 : '1.5rem',
                      }}
                    >
                      <Typography variant="body2">Not Connected</Typography>
                      <ErrorOutlineIcon
                        fontSize="small"
                        sx={{ marginLeft: 0.5 }}
                      />
                    </Box>
                  )}
                {isConnected &&
                  !params.row.hasActiveMaintenance &&
                  !params.row.hasFutureMaintenance && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mt: isMobile ? 0 : '1.5rem',
                      }}
                    >
                      <Typography variant="body2">Connected</Typography>
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
        minWidth: 175,
        maxWidth: 175, // Adjusted maxWidth so all icons show
        renderCell: (params) => {
          return (
            <>
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
            </>
          )
        },
      },
    ],
    [
      columnWidths,
      renderCellWithTooltip,
      accessLevels.canRunConnectionTest,
      isMobile,
      updateRow,
    ]
  )

  // Mobile Card Component
  const MobileCard = React.memo(
    ({
      row,
      index,
    }: {
      row: {
        destId: string
        destTypeId: number
        status?: string
        statusAt?: string
        jurisdictionName?: string
        destType?: string
        destUri?: string
        hasActiveMaintenance?: boolean
        hasFutureMaintenance?: boolean
        maintenanceValues?: {
          maint_start: string
          maint_end: string
        } | null
        hasChangeRequest?: boolean
        hasActiveDraft?: boolean
      }
      index: number
    }) => {
      const isConnected = row.status?.toLowerCase() === 'connected'
      const asOfDate = row.statusAt
        ? new Date(row.statusAt).toLocaleString()
        : 'Unknown'

      return (
        <Card
          key={row.destId + row.destTypeId}
          sx={{
            marginBottom: '12px',
            padding: '16px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            backgroundColor: row.hasActiveMaintenance
              ? palette.errorHighLight
              : 'white',
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
              {row.destId}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isConnected ? (
                <CheckIcon fontSize="small" />
              ) : (
                <ErrorOutlineIcon fontSize="small" />
              )}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 'bold',
                }}
              >
                {isConnected ? 'Connected' : 'Not Connected'}
              </Typography>
            </Box>
          </Box>
          {/* Content */}
          <Box sx={{ marginBottom: '12px' }}>
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ marginBottom: '4px' }}
            >
              <strong>Organization:</strong> {row.jurisdictionName}
            </Typography>
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ marginBottom: '4px' }}
            >
              <strong>Environment:</strong> {row.destType}
            </Typography>
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ marginBottom: '4px', overflowWrap: 'anywhere' }}
            >
              <strong>Endpoint:</strong> {row.destUri}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              <strong>Last Updated:</strong> {asOfDate}
            </Typography>
          </Box>
          {/* Maintenance Status */}
          {(row.hasFutureMaintenance || row.hasActiveMaintenance) && (
            <Box
              sx={{
                marginBottom: '12px',
                padding: '8px',
                backgroundColor: '#fff3cd',
                borderRadius: '4px',
              }}
            >
              <Typography variant="body2" sx={{ color: palette.warningDark }}>
                {row.hasActiveMaintenance
                  ? `Under maintenance until ${
                      _.isNull(row.maintenanceValues)
                        ? 'ended by user'
                        : moment(
                            new Date(row.maintenanceValues.maint_end)
                          ).format('MMM DD, YYYY [at] h:mm A')
                    }`
                  : `Maintenance scheduled from ${moment(
                      new Date(row.maintenanceValues.maint_start)
                    ).format('MMM DD, YYYY [at] h:mm A')}`}
              </Typography>
            </Box>
          )}
          {/* Action Buttons */}
          <Box
            sx={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              justifyContent: 'flex-start',
            }}
          >
            <ChangeRequestActionButtons
              tabIndex={index}
              destId={row.destId}
              destTypeId={row.destTypeId}
              hasChangeRequest={row.hasChangeRequest}
              hasActiveDraft={row.hasActiveDraft}
            />
            {accessLevels.canRunConnectionTest && (
              <TestConnectionButton
                tabIndex={index}
                destId={row.destId}
                destTypeId={row.destTypeId}
              />
            )}
            <PopOverActionButtons
              destId={row.destId}
              destTypeId={row.destTypeId}
              status={row.status}
              hasActiveMaintenance={
                row.hasActiveMaintenance || row.hasFutureMaintenance
              }
              jurisdictionName={row.jurisdictionName}
              destType={row.destType}
              row={row}
              updateRow={updateRow}
            />
          </Box>{' '}
          {/* Checkbox for selection (when test reports mode is active) */}
          {showCheckbox && (
            <Box
              sx={{ marginTop: '12px', display: 'flex', alignItems: 'center' }}
            >
              <input
                type="checkbox"
                checked={selectedRows.includes(row.destId + row.destTypeId)}
                onChange={(e) => {
                  const rowId = row.destId + row.destTypeId
                  if (e.target.checked) {
                    setSelectedRows([...selectedRows, rowId])
                  } else {
                    setSelectedRows(selectedRows.filter((id) => id !== rowId))
                  }
                }}
              />
              <Typography variant="body2" sx={{ marginLeft: '8px' }}>
                Select for Test Report
              </Typography>
            </Box>
          )}
        </Card>
      )
    }
  )

  MobileCard.displayName = 'MobileCard'

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

      {/* Conditional Rendering Based on Mode */}
      {renderMode === 'transitioning' ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px',
            backgroundColor: palette.white,
            marginTop: '16px',
            borderRadius: '8px',
          }}
        >
          <CircularProgress size={24} />
          <Typography sx={{ marginLeft: '12px' }}>Switching view...</Typography>
        </Box>
      ) : renderMode === 'mobile' ? (
        <Box>
          {/* Mobile Toolbar */}
          <Box
            sx={{
              backgroundColor: palette.white,
              padding: '16px',
              boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
              border: `1px solid ${palette.border}`,
              marginBottom: '16px',
              marginTop: '16px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {filteredData.length} Connections Found
            </Typography>

            {/* Search Input */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="text"
                placeholder="Search connections..."
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
                color="secondary"
                onClick={handleTestReportsClick}
                variant="outlined"
                size="small"
                sx={{
                  borderRadius: '24px',
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                {showCheckbox ? 'Cancel Selection' : 'Test Report(s)'}
              </Button>
            </Box>
          </Box>

          {/* Mobile Cards */}
          <Box sx={{ padding: '0 8px' }}>
            {filteredData.map((row, index) => (
              <MobileCard
                key={row.destId + row.destTypeId}
                row={row}
                index={index}
              />
            ))}
          </Box>

          {/* Mobile Footer for Test Reports */}
          {isBoxVisible && (
            <Box
              sx={{
                position: 'fixed',
                bottom: 0,
                left: 70,
                right: 0,
                backgroundColor: palette.white,
                padding: '16px',
                boxShadow: '0px -3px 5px rgba(0, 0, 0, 0.25)',
                zIndex: 1000,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingX: '16px',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 'bold', color: '#005763' }}
                >
                  {selectedRows.length} Connections Selected
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleGenerateReport(selectedRows)}
                  disabled={selectedRows.length === 0}
                  size="small"
                >
                  Generate Report
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      ) : renderMode === 'desktop' ? (
        /* Desktop View */
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
          onColumnWidthChange={(params) => {
            if (isMobile) return // Skip on mobile view (card layout)

            const newWidths = {
              ...(columnWidths || {}),
              [params.colDef.field]: params.width,
            }
            setColumnWidths(newWidths)
            debouncedSaveWidths(newWidths)
          }}
          getRowId={(row) => row.destId + row.destTypeId}
          getRowClassName={(params) => {
            return params.row.hasActiveMaintenance === true ? 'highlight' : ''
          }}
          density={isMobile ? 'standard' : 'comfortable'}
          pagination
          slots={{
            toolbar: CustomToolbar,
            footer: () => <CustomFooter selectedRow={selectedRows} />,
          }}
          slotProps={{
            toolbar: {
              setFilterButtonEl,
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
              columns: { field: 'action', filterable: false },
              onTestReportsClick: handleTestReportsClick,
            } as CustomToolbarProps,
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
      ) : null}
    </div>
  )
}

export default ConnectionsTable
