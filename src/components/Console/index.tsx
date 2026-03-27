import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  BoxProps,
  Chip,
  TextField,
  InputAdornment,
  Popover,
  Divider,
  Button,
  Tooltip,
} from '@mui/material'
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import SearchIcon from '@mui/icons-material/Search'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RefreshIcon from '@mui/icons-material/Refresh'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { useSession } from 'next-auth/react'
import AppHeaderBar from '../AppHeader'
import Container from '../Container'
import palette from '../../styles/theme/palette'
import InboundMessagesWidget from './InboundMessagesWidget'
import OutboundMessagesWidget from './OutboundMessagesWidget'
import DestinationDetailWidget from './DestinationDetailWidget'
import type { Organization } from './MessagesWidgetContent'
import { getElasticEnvTag } from '../../lib/desttypehelper'

interface Destination {
  destId: string
  jurisdictionName?: string
  jurisdiction?: {
    jurisdictionId: number
    name: string
    description: string
  }
  destinationType?: {
    typeId: number
    type: string
  }
}

function toDisplayLabel(envType: string): string {
  const map: Record<string, string> = {
    DEV: 'Development',
    PRODUCTION: 'Production',
    ONBOARD: 'Onboarding',
    TEST: 'Test',
    STAGE: 'Staging',
    UNKNOWN: 'Unknown',
  }
  return map[envType?.toUpperCase()] ?? envType
}

function getEnvColor(envType: string): string {
  // All colors pass WCAG AA on white and white-on-color for chip text
  const colorMap: Record<string, string> = {
    DEV: palette.secondary,
    PRODUCTION: palette.activeDark,
    ONBOARD: palette.warningAccessible,
    TEST: palette.primary,
    STAGE: palette.secondaryDark,
    UNKNOWN: palette.greyText,
  }
  return colorMap[envType?.toUpperCase()] ?? palette.greyText
}

// Priority order for auto-selecting an environment when a destination is chosen
const ENV_PRIORITY: Record<string, number> = {
  PRODUCTION: 0,
  ONBOARD: 1,
  STAGE: 2,
  DEV: 3,
  TEST: 4,
}

function pickDefaultEnv(envTypes: string[]): string {
  if (envTypes.length === 0) return ''
  return [...envTypes].sort(
    (a, b) =>
      (ENV_PRIORITY[a.toUpperCase()] ?? 99) -
      (ENV_PRIORITY[b.toUpperCase()] ?? 99)
  )[0]
}

// Skip-navigation link style (visually hidden, revealed on focus)
const skipNavStyle: React.CSSProperties = {
  position: 'absolute',
  left: '-9999px',
  top: 'auto',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
}
const skipNavFocusStyle: React.CSSProperties = {
  position: 'static',
  width: 'auto',
  height: 'auto',
  padding: '8px 16px',
  background: '#fff',
  zIndex: 9999,
  textDecoration: 'underline',
}

function Item(props: BoxProps) {
  const { sx, ...other } = props
  return (
    <Box
      sx={{
        ...sx,
      }}
      {...other}
    />
  )
}

const Console = () => {
  const { data: session, status } = useSession()
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [destinationsLoading, setDestinationsLoading] = useState(true)
  const [destinationsError, setDestinationsError] = useState<string>('')
  // Browsing state — drives the popover UI (highlight, env chip preview)
  const [selectedConnection, setSelectedConnection] = useState('')
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('')
  // Committed state — only updated on explicit selection; passed to widgets to avoid spurious fetches while browsing
  const [committedConnection, setCommittedConnection] = useState('')
  const [committedEnvironment, setCommittedEnvironment] = useState<string>('')
  const [destPopoverAnchor, setDestPopoverAnchor] =
    useState<null | HTMLElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const uniqueDestinations = useMemo(() => {
    const seen = new Set<string>()
    return destinations.filter((d) => {
      if (seen.has(d.destId)) return false
      seen.add(d.destId)
      return true
    })
  }, [destinations])

  const availableEnvironmentsForSelected = useMemo(() => {
    return destinations
      .filter((d) => d.destId === selectedConnection && d.destinationType?.type)
      .map((d) => d.destinationType?.type as string)
      .sort()
  }, [destinations, selectedConnection])

  const committedEnvTag = committedEnvironment
    ? getElasticEnvTag(committedEnvironment)
    : undefined

  const committedDestinationDescription = useMemo(() => {
    const base =
      uniqueDestinations.find((d) => d.destId === committedConnection)
        ?.jurisdiction?.description ?? committedConnection
    return `${base} (${committedConnection})`
  }, [uniqueDestinations, committedConnection])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [organizationsLoading, setOrganizationsLoading] = useState(false)

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        setDestinationsLoading(true)
        setDestinationsError('')
        const response = await fetch('/api/destinations')
        if (response.ok) {
          const data = await response.json()
          setDestinations(data)
          if (data.length > 0) {
            const first = data[0]
            const allEnvs = data
              .filter(
                (d: Destination) =>
                  d.destId === first.destId && d.destinationType?.type
              )
              .map((d: Destination) => d.destinationType?.type as string)
            const firstEnv = pickDefaultEnv(allEnvs)
            setSelectedConnection(first.destId)
            setSelectedEnvironment(firstEnv)
            setCommittedConnection(first.destId)
            setCommittedEnvironment(firstEnv)
          }
        } else {
          const errorMessage = `Failed to load destinations: ${response.status} ${response.statusText}`
          setDestinationsError(errorMessage)
          console.error(errorMessage)
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'An error occurred while fetching destinations'
        setDestinationsError(errorMessage)
        console.error('Error fetching destinations:', err)
      } finally {
        setDestinationsLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchDestinations()
    }
  }, [status])

  useEffect(() => {
    if (status !== 'authenticated') {
      setOrganizationsLoading(false)
      return
    }
    const fetchOrganizations = async () => {
      try {
        const response = await fetch('/api/organizations')
        if (!response.ok) {
          throw new Error('Failed to fetch organizations')
        }
        const orgData = await response.json()
        const processedOrgs: Organization[] = orgData.map(
          (org: { organizationName?: string; principalNames: string[] }) => ({
            organizationName: org.organizationName || 'Unknown Organization',
            principalNames: Array.from(org.principalNames || []),
          })
        )
        setOrganizations(processedOrgs)
      } catch (error) {
        console.error('Error fetching organizations:', error)
        setOrganizations([])
      } finally {
        setOrganizationsLoading(false)
      }
    }

    fetchOrganizations()
  }, [status])

  const filteredDestinations = useMemo(() => {
    return uniqueDestinations.filter((d) => {
      const q = searchQuery.toLowerCase()
      return (
        (d.jurisdiction?.description ?? '').toLowerCase().includes(q) ||
        d.destId.toLowerCase().includes(q)
      )
    })
  }, [uniqueDestinations, searchQuery])

  // Arrow-key navigation for the destination listbox (ARIA listbox pattern)
  const handleListboxKeyDown = (e: React.KeyboardEvent) => {
    const listbox = e.currentTarget as HTMLElement
    const options = listbox.querySelectorAll<HTMLElement>('[role="option"]')
    if (!options.length) return
    const currentIndex = Array.from(options).findIndex(
      (el) => el === document.activeElement
    )
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (currentIndex + 1) % options.length
      options[nextIndex].focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (currentIndex - 1 + options.length) % options.length
      options[prevIndex].focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      options[0].focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      options[options.length - 1].focus()
    }
  }

  if (status === 'loading') {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        aria-busy="true"
      >
        <CircularProgress aria-label="Loading" />
      </Box>
    )
  }

  if (!session?.user?.isAdmin) {
    return (
      <Container title="Operations Console">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">
            You do not have permission to access the Console. Admin access is
            required.
          </Alert>
        </Box>
      </Container>
    )
  }

  return (
    <>
      {/* Skip-navigation: lets keyboard users bypass the header on each page */}
      <a
        href="#main-content"
        style={skipNavStyle}
        onFocus={(e) => Object.assign(e.currentTarget.style, skipNavFocusStyle)}
        onBlur={(e) => Object.assign(e.currentTarget.style, skipNavStyle)}
      >
        Skip to main content
      </a>
      <div>
        <AppHeaderBar open />
        <Box component="main" id="main-content" tabIndex={-1}>
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: '0px 0px 16px 16px',
              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e0e0e0',
              p: 3,
              mb: 4,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h1"
                  fontWeight={700}
                  fontSize="32px"
                  id="operations-console"
                  sx={{ mb: 1 }}
                >
                  IZ Gateway Operations Console
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Instantly access the most relevant data, including recent
                  trends, system status and usage patterns.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Tooltip title="Refresh data" arrow>
                  <Button
                    variant="text"
                    color="primary"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                      setRefreshKey((k) => k + 1)
                    }}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      '&:hover .MuiSvgIcon-root': {
                        transform: 'rotate(180deg)',
                        transition: 'transform 0.3s ease',
                      },
                    }}
                  >
                    Refresh
                  </Button>
                </Tooltip>
              </Box>
            </Box>
          </Box>

          {/* ── Status Key bar ──────────────────────────────────────── */}
          <Box
            role="region"
            aria-label="Status key legend"
            sx={{
              backgroundColor: 'white',
              border: `1px solid ${palette.divider}`,
              px: 3,
              py: 1.5,
              mb: -1,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flexWrap: 'wrap',
            }}
          >
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              Status Key:
            </Typography>
            {(
              [
                {
                  icon: <span>✓</span>,
                  label: 'Healthy',
                  color: palette.activeDark,
                },
                {
                  icon: (
                    <WarningAmberOutlinedIcon
                      sx={{
                        fontSize: '14px',
                        color: palette.warningAccessible,
                      }}
                    />
                  ),
                  label: 'Warning',
                  color: palette.warningAccessible,
                },
                {
                  icon: <span>✕</span>,
                  label: 'Critical',
                  color: palette.error,
                },
                {
                  icon: <span>—</span>,
                  label: 'No Data',
                  color: palette.greyText,
                },
              ] as { icon: React.ReactNode; label: string; color: string }[]
            ).map(({ icon, label, color }) => (
              <Box
                key={label}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
              >
                <Box
                  component="span"
                  aria-hidden="true"
                  sx={{
                    color,
                    fontWeight: 700,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {icon}
                </Box>
                <Typography
                  component="span"
                  variant="body2"
                  sx={{ color: palette.greyDark, fontWeight: 500 }}
                >
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: '0px 0px 32px 32px',
              boxShadow: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: `1px solid ${palette.divider}`,
              p: 2,
              mb: 1,
            }}
          >
            {destinationsError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {destinationsError}
              </Alert>
            )}

            {/* ── Destination selector trigger ─────────────────────────── */}
            <Box
              role="button"
              tabIndex={0}
              aria-label="Select destination and environment"
              aria-haspopup="dialog"
              aria-expanded={Boolean(destPopoverAnchor)}
              onClick={(e) =>
                !destinationsLoading && setDestPopoverAnchor(e.currentTarget)
              }
              onKeyDown={(e) => {
                if (
                  (e.key === 'Enter' || e.key === ' ') &&
                  !destinationsLoading
                ) {
                  setDestPopoverAnchor(e.currentTarget as HTMLElement)
                }
              }}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                minWidth: '38%',
                gap: 1.5,
                cursor: destinationsLoading ? 'default' : 'pointer',
                borderRadius: '0px 0px 0px 16px',
                p: 2,
                border: '1px solid',
                borderColor: palette.divider,
                transition: 'border-color 0.15s, box-shadow 0.15s',
                '&:hover': {
                  borderColor: palette.primary,
                  boxShadow: '0 0 0 2px rgba(25,118,210,0.08)',
                },
                userSelect: 'none',
              }}
            >
              <Box sx={{ display: 'flex', gap: 2 }}>
                {destinationsLoading ? (
                  <CircularProgress
                    size={18}
                    aria-label="Loading destinations"
                  />
                ) : selectedConnection ? (
                  <Typography
                    component="span"
                    fontWeight={700}
                    sx={{
                      fontSize: '20px',
                      lineHeight: 1.2,
                      color: 'text.primary',
                    }}
                  >
                    {uniqueDestinations.find(
                      (d) => d.destId === selectedConnection
                    )?.jurisdiction?.description ?? selectedConnection}
                  </Typography>
                ) : (
                  <Typography
                    sx={{
                      fontSize: '16px',
                      lineHeight: 1.2,
                      color: 'text.secondary',
                      fontStyle: 'italic',
                    }}
                  >
                    Select a destination
                  </Typography>
                )}

                {!destinationsLoading && selectedEnvironment && (
                  <Chip
                    icon={
                      <RadioButtonCheckedIcon
                        aria-hidden="true"
                        sx={{ fontSize: '13px !important' }}
                      />
                    }
                    label={toDisplayLabel(selectedEnvironment)}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      pointerEvents: 'none',
                      bgcolor: getEnvColor(selectedEnvironment),
                      color: palette.white,
                      '& .MuiChip-icon': { color: palette.white },
                    }}
                  />
                )}
              </Box>
              <ExpandMoreIcon
                aria-hidden="true"
                sx={{
                  color: 'primary.main',
                  fontSize: 20,
                  transform: destPopoverAnchor ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            </Box>

            {/* ── Popover: env chips + destination search ───────────────── */}
            <Popover
              open={Boolean(destPopoverAnchor)}
              anchorEl={destPopoverAnchor}
              onClose={() => {
                setDestPopoverAnchor(null)
                setSearchQuery('')
              }}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              PaperProps={{
                role: 'dialog',
                'aria-modal': true,
                'aria-label': 'Destination and environment selector',
                sx: { mt: 0.5, borderRadius: 2, boxShadow: 4, width: 420 },
              }}
            >
              {/* Env chips + search row */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  pt: 1.5,
                  pb: 1,
                  flexWrap: 'wrap',
                }}
              >
                <Box
                  role="radiogroup"
                  aria-label="Select environment"
                  sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}
                >
                  {availableEnvironmentsForSelected.map((env) => {
                    const selected = selectedEnvironment === env
                    const envColor = getEnvColor(env)
                    return (
                      <Chip
                        key={env}
                        role="radio"
                        aria-checked={selected}
                        icon={
                          selected ? (
                            <RadioButtonCheckedIcon
                              aria-hidden="true"
                              sx={{ fontSize: '14px !important' }}
                            />
                          ) : (
                            <RadioButtonUncheckedIcon
                              aria-hidden="true"
                              sx={{ fontSize: '14px !important' }}
                            />
                          )
                        }
                        label={toDisplayLabel(env)}
                        onClick={() => {
                          setSelectedEnvironment(env)
                          // Commit immediately — destination is already confirmed
                          if (committedConnection) setCommittedEnvironment(env)
                        }}
                        variant={selected ? 'filled' : 'outlined'}
                        size="small"
                        clickable
                        sx={{
                          fontWeight: selected ? 600 : 400,
                          ...(selected && {
                            bgcolor: envColor,
                            color: palette.white,
                            '& .MuiChip-icon': { color: palette.white },
                          }),
                          ...(!selected && {
                            borderColor: envColor,
                            color: envColor,
                            '& .MuiChip-icon': { color: envColor },
                          }),
                        }}
                      />
                    )
                  })}
                </Box>

                <TextField
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for destinations"
                  size="small"
                  inputProps={{ 'aria-label': 'Search destinations' }}
                  sx={{
                    flex: 1,
                    minWidth: 160,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '13px',
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon
                          aria-hidden="true"
                          sx={{ fontSize: 16, color: 'text.secondary' }}
                        />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Divider />

              {/* Destination list */}
              {(() => {
                const filtered = uniqueDestinations.filter((d) => {
                  const q = searchQuery.toLowerCase()
                  return (
                    (d.jurisdiction?.description ?? '')
                      .toLowerCase()
                      .includes(q) || d.destId.toLowerCase().includes(q)
                  )
                })
                return filtered.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ px: 2, py: 1.5 }}
                  >
                    No destinations found
                  </Typography>
                ) : (
                  <Box
                    component="ul"
                    role="listbox"
                    aria-label="Available destinations"
                    sx={{
                      m: 0,
                      p: 0,
                      listStyle: 'none',
                      maxHeight: 260,
                      overflowY: 'auto',
                    }}
                  >
                    {filtered.map((dest) => {
                      const isSelected = dest.destId === selectedConnection
                      return (
                        <Box
                          component="li"
                          key={dest.destId}
                          role="option"
                          tabIndex={0}
                          aria-selected={isSelected}
                          onClick={() => {
                            const firstEnv = pickDefaultEnv(
                              destinations
                                .filter(
                                  (d) =>
                                    d.destId === dest.destId &&
                                    d.destinationType?.type
                                )
                                .map((d) => d.destinationType?.type as string)
                            )
                            setSelectedConnection(dest.destId)
                            setSelectedEnvironment(firstEnv)
                            setCommittedConnection(dest.destId)
                            setCommittedEnvironment(firstEnv)
                            setDestPopoverAnchor(null)
                            setSearchQuery('')
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              const firstEnv = pickDefaultEnv(
                                destinations
                                  .filter(
                                    (d) =>
                                      d.destId === dest.destId &&
                                      d.destinationType?.type
                                  )
                                  .map((d) => d.destinationType?.type as string)
                              )
                              setSelectedConnection(dest.destId)
                              setSelectedEnvironment(firstEnv)
                              setCommittedConnection(dest.destId)
                              setCommittedEnvironment(firstEnv)
                              setDestPopoverAnchor(null)
                              setSearchQuery('')
                            }
                          }}
                          sx={{
                            px: 2,
                            py: 1,
                            cursor: 'pointer',
                            bgcolor: isSelected ? 'primary.50' : 'transparent',
                            borderLeft: isSelected
                              ? '3px solid'
                              : '3px solid transparent',
                            borderColor: isSelected
                              ? getEnvColor(selectedEnvironment)
                              : 'transparent',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={isSelected ? 600 : 400}
                          >
                            {dest.jurisdiction?.description ?? dest.destId}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dest.destId}
                          </Typography>
                        </Box>
                      )
                    })}
                  </Box>
                )
              })()}
            </Popover>
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{
                flex: 1,
                textAlign: 'left',
                fontSize: '13px',
              }}
            >
              Use the dropdown menu to switch between connections or data
              sources, allowing you to explore metrics for different
              environments, accounts, or systems as needed.
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              gap: 4,
              flexDirection: { xs: 'column', md: 'row' },
            }}
          >
            <Item
              sx={{
                width: { xs: '100%', md: '40%' },
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <DestinationDetailWidget
                key={`detail-${committedConnection}-${refreshKey}`}
                selectedConnection={committedConnection}
                envTag={committedEnvTag}
              />
            </Item>

            <Item sx={{ flexGrow: 1 }}>
              <OutboundMessagesWidget
                key={`outbound-${committedConnection}-${refreshKey}`}
                selectedConnection={committedConnection}
                selectedConnectionDescription={committedDestinationDescription}
                organizations={organizations}
                organizationsLoading={organizationsLoading}
                destinations={destinations}
                envTag={committedEnvTag}
              />
              <InboundMessagesWidget
                key={`inbound-${committedConnection}-${refreshKey}`}
                selectedConnection={committedConnection}
                selectedConnectionDescription={committedDestinationDescription}
                organizations={organizations}
                organizationsLoading={organizationsLoading}
                envTag={committedEnvTag}
              />
            </Item>
          </Box>
        </Box>
      </div>
    </>
  )
}

export default Console
