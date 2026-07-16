import React, { useState, useMemo, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  DataGrid,
  GridColDef,
  GridFooter,
  GridFooterContainer,
  GridRenderCellParams,
  GridToolbarContainer,
  GridToolbarProps,
} from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import CheckIcon from '@mui/icons-material/Check'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import FlagIcon from '@mui/icons-material/Flag'
import ListAltIcon from '@mui/icons-material/ListAlt'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import TuneIcon from '@mui/icons-material/Tune'
import VisibilityIcon from '@mui/icons-material/Visibility'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import CustomDialogBox from '../DialogBox/CustomDialogBox'
import CustomSnackbar from '../SnackBar'
import { getAllowedEnvironmentValues } from '../Dropdown/EnvironmentSelect'
import palette from '../../styles/theme/palette'
import { useSession } from 'next-auth/react'
import fetcher from '../../lib/fetch'
import { ApiKeyCredential } from '../../lib/type/ApiKeyCredential'
import { Jurisdiction } from '../../lib/type/Jurisdiction'
import { getEnvironmentName, DEST_TYPES } from '../../lib/desttypehelper'

const ENV_DISPLAY_NAMES: Record<string, string> = {
  PRODUCTION: 'Production',
  TEST: 'Testing',
  ONBOARD: 'Onboarding',
  STAGE: 'Staging',
  DEV: 'Development',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiKey {
  id: string
  keyId: string
  sortKey: string
  description: string
  environment: string
  jurisdiction: string
  jurisdictionId: string
  envRaw: string
  domain: string | null
  status: 'Active' | 'Ready for Validation' | 'Validation' | 'Grace Period' | 'Revoked' | string
  created: string
  expires: string
  createdBy: string
  revokedAt: string | null
  graceExpiresAt: string | null
  expiresAtRaw: string | null
  viewed: boolean
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}

function toRow(cred: ApiKeyCredential): ApiKey {
  return {
    id: cred.jti,
    keyId: cred.jti,
    sortKey: cred.sortKey,
    description: cred.description ?? '—',
    jurisdictionId: cred.jurisdictionId,
    envRaw: cred.env ?? '',
    domain: cred.domain ?? null,
    environment: (() => {
      if (!cred.env) return '—'
      const code = isNaN(Number(cred.env)) ? cred.env.toUpperCase() : getEnvironmentName(Number(cred.env))
      return ENV_DISPLAY_NAMES[code] ?? code
    })(),
    jurisdiction: cred.jurisdictionDescription ?? cred.jurisdictionId,
    status: (() => {
      const now = new Date()
      const graceActive = cred.graceExpiresAt && new Date(cred.graceExpiresAt) > now
      if (cred.status === 'revoked') return 'Revoked'
      if (graceActive) return 'Grace Period'
      if (cred.status === 'ready_for_validation') return 'Ready for Validation'
      if (cred.status === 'active') return 'Active'
      return cred.status
        ? cred.status.replace(/\b\w/g, (c) => c.toUpperCase())
        : cred.status
    })(),
    created: formatDate(cred.createdOn),
    expires: formatDate(cred.expiresAt),
    createdBy: cred.createdBy ?? '—',
    revokedAt: cred.revokedAt ? formatDate(cred.revokedAt) : null,
    graceExpiresAt: cred.graceExpiresAt ? formatDate(cred.graceExpiresAt) : null,
    expiresAtRaw: (() => {
      if (!cred.expiresAt) return null
      const d = new Date(cred.expiresAt)
      return isNaN(d.getTime()) ? null : d.toISOString()
    })(),
    viewed: !!cred.viewedAt,
  }
}

// ─── DataGrid sx (identical to ConnectionsTable) ──────────────────────────────

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
  '& .MuiDataGrid-row:hover': { bgcolor: '#00000010' },
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: palette.white,
    '& .MuiDataGrid-columnHeaderTitle': {
      fontSize: '0.75rem',
      fontWeight: 600,
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
    padding: '24px 16px 0px 16px',
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
    border: `1px solid ${palette.border}`,
    marginBottom: '8px',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 0,
  },
  '& svg.MuiSvgIcon-root.MuiSvgIcon-fontSizeSmall.MuiDataGrid-sortIcon.css-ptiqhd-MuiSvgIcon-root':
    {
      color: palette.primary,
    },
  '& .MuiDataGrid-footerContainer.MuiDataGrid-footerContainer': {
    width: '100%',
    float: 'none',
    margin: '1em 0',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    boxShadow: 'none',
    borderRadius: 0,
  },
  '& .MuiTablePagination-actions': { color: palette.primary },
  '& .MuiTablePagination-selectIcon.MuiSelect-icon.MuiSelect-iconStandard.css-pqjvzy-MuiSvgIcon-root-MuiSelect-icon':
    {
      color: palette.primary,
    },
  '& .MuiDataGrid-virtualScroller': { overflow: 'hidden' },
  '& .MuiDataGrid-selectedRowCount': {
    visibility: 'hidden',
    width: 0,
    marginLeft: '-8px',
  },
}

// ─── Static sub-components (defined OUTSIDE main component to prevent infinite loops) ──

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Box
      sx={{
        borderRadius: '12px',
        backgroundColor: palette.greyLight,
        p: 2,
        minWidth: 140,
      }}
    >
      <Typography sx={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>
        {value}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: palette.greyText, fontWeight: 600, letterSpacing: '0.03em' }}
      >
        {label.toUpperCase()}
      </Typography>
    </Box>
  )
}

function StatCards({ apiKeys }: { apiKeys: ApiKey[] }) {
  const total = apiKeys.length
  const active = apiKeys.filter((k) => k.status === 'Active').length
  const revoked = apiKeys.filter((k) => k.status === 'Revoked').length
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
      <StatCard label="Total Keys" value={total} />
      <StatCard label="Active" value={active} />
      <StatCard label="Revoked" value={revoked} />
    </Box>
  )
}

function ViewKeyDialog({
  apiKey,
  onClose,
}: {
  apiKey: ApiKey | null
  onClose: () => void
}) {
  if (!apiKey) return null
  return (
    <CustomDialogBox
      open={!!apiKey}
      onClose={onClose}
      maxWidth="sm"
      titleText="View API Key"
      content={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <PolicyField label="Organization" value={apiKey.jurisdiction} />
            <PolicyField label="Environment" value={apiKey.environment} />
          </Box>
          <PolicyField label="Description" value={apiKey.description} />
          <PolicyField label="Status" value={apiKey.status} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <PolicyField label="Created" value={apiKey.created} />
            <PolicyField label="Expires" value={apiKey.expires} />
          </Box>
          <PolicyField label="Created By" value={apiKey.createdBy} />
          <PolicyField label="Key ID" value={apiKey.keyId} />
        </Box>
      }
      actions={
        <Button
          fullWidth
          variant="outlined"
          onClick={onClose}
          sx={{ borderRadius: '50px', fontWeight: 700, py: 1.5 }}
        >
          CLOSE
        </Button>
      }
    />
  )
}

function StatusCell({ row }: { row: ApiKey }) {
  const { status } = row
  if (status === 'Active') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          color: palette.secondary,
        }}
      >
        <Typography variant="body2" sx={{ color: 'inherit', fontWeight: 500 }}>
          Active
        </Typography>
        <CheckIcon sx={{ fontSize: 16 }} />
      </Box>
    )
  }
  if (status === 'Revoked') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: palette.error }}>
        <Typography variant="body2" sx={{ color: 'inherit', fontWeight: 500 }}>
          Revoked
        </Typography>
        <FlagIcon sx={{ fontSize: 16 }} />
      </Box>
    )
  }
  if (status === 'Grace Period') {
    return (
      <Typography variant="body2" sx={{ color: palette.warning ?? '#ed6c02' }}>
        {row.graceExpiresAt
          ? `Grace period expires on ${row.graceExpiresAt}`
          : 'Grace Period'}
      </Typography>
    )
  }
  return (
    <Typography variant="body2" sx={{ color: palette.greyText }}>
      {status}
    </Typography>
  )
}

function ActionIconButton({
  title,
  onClick,
  disabled,
  color,
  children,
}: {
  title: string
  onClick: () => void
  disabled?: boolean
  color?: string
  children: React.ReactNode
}) {
  return (
    <Tooltip title={title} arrow>
      <span>
        <IconButton
          size="small"
          onClick={onClick}
          disabled={disabled}
          sx={{
            border: `1px solid ${palette.border}`,
            borderRadius: '50%',
            width: 32,
            height: 32,
          }}
        >
          <Box sx={{ display: 'flex', fontSize: 18, color: color ?? palette.greyText }}>
            {children}
          </Box>
        </IconButton>
      </span>
    </Tooltip>
  )
}

function ActionCell({
  row,
  onView,
  onRevoke,
  onRenew,
  onValidate,
  onRevealToken,
  validating,
}: {
  row: ApiKey
  onView: (key: ApiKey) => void
  onRevoke: (key: ApiKey) => void
  onRenew: (key: ApiKey) => void
  onValidate: (key: ApiKey) => void
  onRevealToken: (key: ApiKey) => void
  validating: boolean
}) {
  if (row.status === 'Revoked') {
    return (
      <Typography variant="body2" sx={{ color: palette.greyText }}>
        {row.revokedAt ? `Revoked ${row.revokedAt}` : 'Revoked'}
      </Typography>
    )
  }

  if (row.status === 'Grace Period') {
    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <ActionIconButton title="Revoke key" onClick={() => onRevoke(row)} color={palette.error}>
          <RemoveCircleOutlineIcon sx={{ fontSize: 'inherit' }} />
        </ActionIconButton>
      </Box>
    )
  }

  if (row.status === 'Ready for Validation') {
    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <ActionIconButton
          title="Validate domain"
          onClick={() => onValidate(row)}
          disabled={validating}
          color={palette.primary}
        >
          <CheckIcon sx={{ fontSize: 'inherit' }} />
        </ActionIconButton>
        <ActionIconButton title="Cancel key" onClick={() => onRevoke(row)} color={palette.error}>
          <RemoveCircleOutlineIcon sx={{ fontSize: 'inherit' }} />
        </ActionIconButton>
      </Box>
    )
  }

  if (row.status === 'Validation') {
    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <ActionIconButton title="View key" onClick={() => onView(row)} color={palette.primary}>
          <VisibilityIcon sx={{ fontSize: 'inherit' }} />
        </ActionIconButton>
        <ActionIconButton title="Cancel key" onClick={() => onRevoke(row)} color={palette.error}>
          <RemoveCircleOutlineIcon sx={{ fontSize: 'inherit' }} />
        </ActionIconButton>
      </Box>
    )
  }

  // Active
  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {!row.viewed && (
        <ActionIconButton title="View key" onClick={() => onRevealToken(row)} color={palette.primary}>
          <VisibilityIcon sx={{ fontSize: 'inherit' }} />
        </ActionIconButton>
      )}
      <ActionIconButton title="Renew key" onClick={() => onRenew(row)}>
        <AutorenewIcon sx={{ fontSize: 'inherit' }} />
      </ActionIconButton>
      <ActionIconButton title="Revoke key" onClick={() => onRevoke(row)} color={palette.error}>
        <RemoveCircleOutlineIcon sx={{ fontSize: 'inherit' }} />
      </ActionIconButton>
    </Box>
  )
}

// ─── Toolbar — hoisted outside main component, receives props via slotProps ───

interface CustomToolbarProps extends GridToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  tabValue: number
  onTabChange: (value: number) => void
}

function CustomToolbar({
  search,
  onSearchChange,
  tabValue,
  onTabChange,
}: CustomToolbarProps) {
  return (
    <GridToolbarContainer>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          gap: 1,
          pb: 1,
        }}
      >
        <TextField
          size="small"
          placeholder="Search by key ID or jurisdiction"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{
            width: '32vw',
            '& .MuiOutlinedInput-root': { borderRadius: '4px' },
            '@media (max-width: 768px)': { width: '100%', maxWidth: '200px' },
          }}
        />
        <Box sx={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button
            variant="text"
            startIcon={<TuneIcon />}
            sx={{
              borderRadius: '24px',
              padding: '8px 16px',
              textTransform: 'none',
              fontWeight: 500,
              color: palette.greyDarkTypography,
            }}
          >
            Filters
          </Button>
        </Box>
      </Box>

      <Box sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => onTabChange(v)}
          aria-label="API key management tabs"
          TabIndicatorProps={{ style: { display: 'none' } }}
          sx={{
            minHeight: 40,
            gap: 1,
            '& .MuiTab-root': {
              minHeight: 40,
              py: 0,
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.75rem',
            },
            '& .MuiTab-root.Mui-selected': {
              backgroundColor: '#E8F0FE',
              color: palette.primary,
            },
          }}
        >
          <Tab
            icon={<VpnKeyIcon sx={{ fontSize: 16 }} />}
            label="KEYS"
            iconPosition="start"
            id="apikeys-tab-0"
          />
          <Tab
            icon={<ListAltIcon sx={{ fontSize: 16 }} />}
            label="AUDIT LOG"
            iconPosition="start"
            id="apikeys-tab-1"
          />
        </Tabs>
      </Box>
    </GridToolbarContainer>
  )
}

// ─── Footer — hoisted outside main component ──────────────────────────────────

interface CustomFooterProps {
  onCreateKey: () => void
}

function CustomFooter({ onCreateKey }: CustomFooterProps) {
  return (
    <GridFooterContainer
      sx={{
        display: 'flex',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        px: 2,
      }}
    >
      <Button
        color="secondary"
        onClick={onCreateKey}
        variant="outlined"
        startIcon={<AddIcon />}
        sx={{
          borderRadius: '24px',
          padding: '8px 16px',
          textTransform: 'none',
          fontWeight: 500,
        }}
      >
        Create Key
      </Button>
      <Box
        sx={{
          borderRadius: '60px',
          boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
          backgroundColor: palette.white,
          overflow: 'hidden',
        }}
      >
        <GridFooter />
      </Box>
    </GridFooterContainer>
  )
}

// ─── Dialog helpers ───────────────────────────────────────────────────────────

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography
        variant="body2"
        sx={{ fontWeight: 500, color: palette.greyDarkTypography, whiteSpace: 'nowrap' }}
      >
        {label}
        {required && (
          <Box component="span" sx={{ color: palette.error }}>
            {' '}*
          </Box>
        )}
      </Typography>
      <Box sx={{ flex: 1, borderTop: `1px solid ${palette.border}` }} />
    </Box>
  )
}

function LabeledField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <FieldLabel label={label} required={required} />
      {children}
    </Box>
  )
}

const roundedFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
  },
}

function PolicyField({ label, value }: { label: string; value: string }) {
  return (
    <TextField
      label={label}
      value={value}
      fullWidth
      size="small"
      InputProps={{ readOnly: true }}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: '8px',
          backgroundColor: palette.greyLight,
        },
        '& .MuiInputBase-input': { color: palette.greyDarkTypography },
      }}
    />
  )
}

function RevokeDialog({
  apiKey,
  onClose,
  onConfirm,
}: {
  apiKey: ApiKey | null
  onClose: () => void
  onConfirm: (reason?: string) => void
}) {
  const [reason, setReason] = useState('')
  if (!apiKey) return null

  const handleConfirm = () => {
    onConfirm(reason || undefined)
    setReason('')
  }

  return (
    <CustomDialogBox
      open={!!apiKey}
      onClose={onClose}
      maxWidth="sm"
      titleText="Revoke API Key"
      content={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2">
            Revoking{' '}
            <strong>
              {apiKey.jurisdiction} | {apiKey.keyId}
            </strong>{' '}
            — this cannot be undone.
          </Typography>
          <Alert
            severity="error"
            icon={<WarningAmberIcon />}
            sx={{
              borderRadius: '8px',
              backgroundColor: '#FFF0F0',
              color: palette.error,
            }}
          >
            Any integration using this key will stop working immediately upon
            revocation.
          </Alert>
          <TextField
            label="Reason (optional)"
            placeholder="e.g AAMBAE"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            size="small"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />
        </Box>
      }
      actions={
        <Button
          fullWidth
          variant="outlined"
          onClick={handleConfirm}
          sx={{
            borderRadius: '50px',
            borderColor: palette.error,
            color: palette.error,
            fontWeight: 700,
            py: 1.5,
            '&:hover': {
              backgroundColor: '#FFF0F0',
              borderColor: palette.error,
            },
          }}
        >
          CONFIRM REVOCATION
        </Button>
      }
    />
  )
}

function RenewDialog({
  apiKey,
  onClose,
  onRenewed,
}: {
  apiKey: ApiKey | null
  onClose: () => void
  onRenewed: (sortKey: string) => void
}) {
  const [upn, setUpn] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!apiKey) return null

  const handleClose = () => {
    setUpn('')
    setDescription('')
    setError(null)
    onClose()
  }

  const handleConfirm = async () => {
    if (!upn.trim()) {
      setError('Domain (upn) is required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // Derive numeric envId from envRaw (may be numeric string "5" or legacy "DEV")
      const envIdNum = isNaN(Number(apiKey.envRaw))
        ? (() => {
            const upper = apiKey.envRaw.toUpperCase()
            const found = ENV_OPTIONS.find(
              (o) => o.name === upper || o.displayName.toUpperCase() === upper
            )
            return found ? found.id : null
          })()
        : Number(apiKey.envRaw)

      if (!envIdNum) {
        throw new Error(`Cannot determine environment ID from: ${apiKey.envRaw}`)
      }

      const res = await fetch('/api/apikeys/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldSortKey: apiKey.sortKey,
          oldExpiresAt: apiKey.expiresAtRaw,
          jurisdictionId: apiKey.jurisdictionId,
          envId: envIdNum,
          upn: upn.trim(),
          description: description.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to renew key')
      }
      const { sortKey } = await res.json()
      mutate('/api/apikeys')
      handleClose()
      onRenewed(sortKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to renew key')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CustomDialogBox
      open={!!apiKey}
      onClose={handleClose}
      maxWidth="sm"
      titleText="Renew API Key"
      content={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2">
            A new key will be issued. The old key stays valid for{' '}
            <strong>10 business days</strong> then expires automatically.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <PolicyField label="Jurisdiction" value={apiKey.jurisdiction} />
            <PolicyField label="Environment" value={apiKey.environment} />
          </Box>
          {error && (
            <Alert severity="error" sx={{ borderRadius: '8px' }}>
              {error}
            </Alert>
          )}
          <TextField
            label="Description (optional)"
            placeholder="e.g. Massachusetts IIS production key — renewal"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />
          <TextField
            label="Domain (upn)"
            placeholder="e.g. immunize.ma.gov"
            value={upn}
            onChange={(e) => setUpn(e.target.value)}
            fullWidth
            size="small"
            required
            helperText="DNS domain for the new JWT upn claim"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />
        </Box>
      }
      actions={
        <Button
          fullWidth
          variant="outlined"
          onClick={handleConfirm}
          disabled={submitting || !upn.trim()}
          sx={{
            borderRadius: '50px',
            borderColor: palette.primary,
            color: palette.primary,
            fontWeight: 700,
            py: 1.5,
            '&:hover': { backgroundColor: '#F0F6FF', borderColor: palette.primary },
          }}
        >
          {submitting ? 'RENEWING...' : 'RENEW KEY'}
        </Button>
      }
    />
  )
}

const ENV_OPTIONS = DEST_TYPES.reduce(
  (acc, name, id) => {
    if (name && name !== 'UNKNOWN') acc.push({ id, name, displayName: ENV_DISPLAY_NAMES[name] ?? name })
    return acc
  },
  [] as { id: number; name: string; displayName: string }[]
)

// Environments selectable when creating a new key — filtered down to what's
// relevant for the app's own deploy environment (same single source of truth
// EnvironmentSelect uses elsewhere in the app). ENV_OPTIONS itself stays
// unfiltered since existing keys can carry any environment value regardless
// of where this instance of the console is deployed.
const ALLOWED_CREATE_ENV_IDS = getAllowedEnvironmentValues()
const CREATE_ENV_OPTIONS = ENV_OPTIONS.filter((opt) =>
  ALLOWED_CREATE_ENV_IDS.includes(String(opt.id))
)

const OTHER_DNS_VALUE = '__other__'

// Validates a custom DNS name entered when "Other" is selected: requires a
// real FQDN (at least one dot, e.g. dev.iz.gateway.org) — labels 1-63 chars,
// letters/digits/hyphens only, no leading/trailing hyphen, 253 chars max.
const DOMAIN_NAME_REGEX =
  /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))+$/

function isValidDomainName(value: string): boolean {
  return DOMAIN_NAME_REGEX.test(value.trim())
}

type CreateKeyStep = 'form' | 'challenge' | 'success' | 'failure'

function CreateKeyDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (sortKey: string) => void
}) {
  const { status: sessionStatus } = useSession()
  const { data: jurisdictions } = useSWR<Jurisdiction[]>(
    sessionStatus === 'authenticated' ? '/api/jurisdictions' : null,
    fetcher
  )

  const [jurisdictionId, setJurisdictionId] = useState<string>('')
  const [envId, setEnvId] = useState<string>('')
  const [dnsSelection, setDnsSelection] = useState<string>('')
  const [customDomain, setCustomDomain] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<CreateKeyStep>('form')
  const [challenge, setChallenge] = useState<{
    sortKey: string
    jti: string
    txtRecord: string
    txtValue: string
    domain: string
    envId: number
  } | null>(null)

  const { data: existingDomains } = useSWR<{ domain: string }[]>(
    envId ? `/api/apikeys/domains?envId=${envId}` : null,
    fetcher
  )

  const jurisdictionDescription =
    (Array.isArray(jurisdictions) &&
      jurisdictions.find((j) => String(j.jurisdictionId) === jurisdictionId)
        ?.description) ||
    ''

  const environmentDisplayName =
    CREATE_ENV_OPTIONS.find((opt) => String(opt.id) === envId)?.displayName || ''

  const isOther = dnsSelection === OTHER_DNS_VALUE

  const handleClose = () => {
    setJurisdictionId('')
    setEnvId('')
    setDnsSelection('')
    setCustomDomain('')
    setDescription('')
    setChallenge(null)
    setError(null)
    setStep('form')
    onClose()
  }

  const handleNext = async () => {
    const upn = isOther ? customDomain.trim() : dnsSelection
    if (!jurisdictionId || !envId || !upn) {
      setError('Please fill in all fields.')
      return
    }
    if (isOther && !isValidDomainName(upn)) {
      setError('Enter a valid domain name, e.g. dev.iz.gateway.org')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jurisdictionId,
          envId: Number(envId),
          upn,
          description: description.trim() || undefined,
          dnsChoice: isOther ? 'other' : 'existing',
        }),
      })
      const body = await res.json()
      if (res.status === 202) {
        setChallenge({
          sortKey: body.sortKey,
          jti: body.jti,
          txtRecord: body.txtRecord,
          txtValue: body.txtValue,
          domain: body.domain,
          envId: body.envId,
        })
        mutate('/api/apikeys')
        setStep('challenge')
        return
      }
      if (!res.ok) throw new Error(body.error || 'Failed to create key')
      mutate('/api/apikeys')
      handleClose()
      onCreated(body.sortKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key')
    } finally {
      setSubmitting(false)
    }
  }

  const handleValidate = async () => {
    if (!challenge) return
    setVerifying(true)
    setError(null)
    try {
      const res = await fetch('/api/apikeys/verify-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: challenge.domain,
          envId: challenge.envId,
          sortKey: challenge.sortKey,
          jti: challenge.jti,
          jurisdictionId,
        }),
      })
      const body = await res.json()
      mutate('/api/apikeys')
      if (!res.ok || !body.verified) {
        setError(body.error || "We couldn't find the expected record.")
        setStep('failure')
        return
      }
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      setStep('failure')
    } finally {
      setVerifying(false)
    }
  }

  const formContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="body2" sx={{ color: palette.greyText }}>
        A new key pair will be generated for{' '}
        {jurisdictionDescription || 'the selected jurisdiction'}
        {environmentDisplayName ? ` (${environmentDisplayName})` : ''}.
      </Typography>
      {error && <Alert severity="error" sx={{ borderRadius: '8px' }}>{error}</Alert>}
      <LabeledField label="Organization" required>
        <Select
          value={jurisdictionId}
          onChange={(e) => setJurisdictionId(e.target.value)}
          displayEmpty
          fullWidth
          sx={roundedFieldSx['& .MuiOutlinedInput-root']}
          renderValue={(value) => {
            if (!value) {
              return <Box sx={{ color: palette.greyText }}>Select organization</Box>
            }
            const j = Array.isArray(jurisdictions)
              ? jurisdictions.find((j) => String(j.jurisdictionId) === value)
              : undefined
            return j?.description || j?.name || value
          }}
        >
          {Array.isArray(jurisdictions) &&
            jurisdictions.map((j) => (
              <MenuItem key={j.jurisdictionId} value={String(j.jurisdictionId)}>
                {j.description || j.name || j.jurisdictionId}
              </MenuItem>
            ))}
        </Select>
      </LabeledField>
      <LabeledField label="Environment" required>
        <Select
          value={envId}
          onChange={(e) => {
            setEnvId(e.target.value)
            setDnsSelection('')
            setCustomDomain('')
          }}
          displayEmpty
          fullWidth
          sx={roundedFieldSx['& .MuiOutlinedInput-root']}
          renderValue={(value) => {
            if (!value) return <Box sx={{ color: palette.greyText }}>Select environment</Box>
            return CREATE_ENV_OPTIONS.find((o) => String(o.id) === value)?.displayName ?? value
          }}
        >
          {CREATE_ENV_OPTIONS.map((opt) => (
            <MenuItem key={opt.id} value={String(opt.id)}>{opt.displayName}</MenuItem>
          ))}
        </Select>
      </LabeledField>
      <LabeledField label="Description" required>
        <TextField
          placeholder="e.g AAMBAE"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          sx={roundedFieldSx}
        />
      </LabeledField>
      <LabeledField label="DNS Name" required>
        <Select
          value={dnsSelection}
          onChange={(e) => setDnsSelection(e.target.value)}
          disabled={!envId}
          displayEmpty
          fullWidth
          sx={roundedFieldSx['& .MuiOutlinedInput-root']}
          renderValue={(value) => {
            if (!value) {
              return (
                <Box sx={{ color: palette.greyText }}>
                  Select from dropdown or create a new one
                </Box>
              )
            }
            return value === OTHER_DNS_VALUE ? 'Other' : value
          }}
        >
          {Array.isArray(existingDomains) &&
            existingDomains.map((d) => (
              <MenuItem key={d.domain} value={d.domain}>{d.domain}</MenuItem>
            ))}
          <MenuItem value={OTHER_DNS_VALUE}>Other</MenuItem>
        </Select>
      </LabeledField>
      {isOther && (
        <LabeledField label="Custom DNS Name" required>
          <TextField
            placeholder="dev.iz.gateway.org"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            error={!!customDomain && !isValidDomainName(customDomain)}
            helperText={
              customDomain && !isValidDomainName(customDomain)
                ? 'Enter a valid domain name, e.g. dev.iz.gateway.org'
                : ' '
            }
            fullWidth
            sx={roundedFieldSx}
          />
        </LabeledField>
      )}
    </Box>
  )

  const challengeContent = challenge && (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2">
        Add the following DNS TXT record at your DNS provider to verify domain
        ownership:
      </Typography>
      <Box sx={{ backgroundColor: palette.greyLight, borderRadius: '8px', p: 2, fontFamily: 'monospace' }}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {challenge.txtRecord} → &quot;{challenge.txtValue}&quot;
        </Typography>
      </Box>
      <Alert severity="info" sx={{ borderRadius: '8px' }}>
        DNS changes may take up to 48 hours to propagate.
      </Alert>
    </Box>
  )

  const successContent = challenge && (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" sx={{ color: palette.greyDarkTypography }}>
        Your validation for {jurisdictionDescription || challenge.envId} was
        confirmed. You can now remove this record.
      </Typography>
      <Box sx={{ backgroundColor: palette.greyLight, borderRadius: '8px', p: 2 }}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {challenge.txtRecord} → &quot;{challenge.txtValue}&quot;
        </Typography>
      </Box>
    </Box>
  )

  const failureContent = challenge && (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" sx={{ color: palette.greyDarkTypography }}>
        We couldn&apos;t find the expected record. Add this TXT record at your
        DNS provider and try again:
      </Typography>
      <Box sx={{ backgroundColor: '#FDECEA', borderRadius: '8px', p: 2 }}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {challenge.txtRecord} → &quot;{challenge.txtValue}&quot;
        </Typography>
      </Box>
      {error && <Alert severity="warning" sx={{ borderRadius: '8px' }}>{error}</Alert>}
    </Box>
  )

  const titleByStep: Record<CreateKeyStep, React.ReactNode> = {
    form: 'Create API Key',
    challenge: 'Verify Domain Ownership',
    success: (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CheckCircleIcon sx={{ fontSize: 28, color: palette.secondary }} />
        <span>Validation Completed!</span>
      </Box>
    ),
    failure: (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon sx={{ fontSize: 28, color: palette.error }} />
        <span>Validation Failed</span>
      </Box>
    ),
  }

  const contentByStep: Record<CreateKeyStep, React.ReactNode> = {
    form: formContent,
    challenge: challengeContent,
    success: successContent,
    failure: failureContent,
  }

  const actionsByStep: Record<CreateKeyStep, React.ReactNode> = {
    form: (
      <Button
        variant="contained"
        onClick={handleNext}
        disabled={
          submitting ||
          !jurisdictionId ||
          !envId ||
          !dnsSelection ||
          (isOther && !isValidDomainName(customDomain))
        }
        sx={{
          flex: 1,
          borderRadius: '50px',
          backgroundColor: palette.primary,
          fontWeight: 700,
          py: 1.5,
          '&:hover': { backgroundColor: palette.primaryDark },
        }}
      >
        {submitting ? 'CHECKING...' : 'NEXT'}
      </Button>
    ),
    challenge: (
      <Button
        variant="contained"
        onClick={handleValidate}
        disabled={verifying}
        sx={{
          flex: 1,
          borderRadius: '50px',
          backgroundColor: palette.primary,
          fontWeight: 700,
          py: 1.5,
          '&:hover': { backgroundColor: palette.primaryDark },
        }}
      >
        {verifying ? 'VALIDATING...' : 'VALIDATE'}
      </Button>
    ),
    success: (
      <Button
        variant="contained"
        onClick={() => {
          const sortKey = challenge?.sortKey
          handleClose()
          if (sortKey) onCreated(sortKey)
        }}
        sx={{
          flex: 1,
          borderRadius: '50px',
          backgroundColor: palette.primary,
          fontWeight: 700,
          py: 1.5,
          '&:hover': { backgroundColor: palette.primaryDark },
        }}
      >
        VIEW KEY
      </Button>
    ),
    failure: (
      <Button
        variant="contained"
        onClick={handleValidate}
        disabled={verifying}
        sx={{
          flex: 1,
          borderRadius: '50px',
          backgroundColor: palette.primary,
          fontWeight: 700,
          py: 1.5,
          '&:hover': { backgroundColor: palette.primaryDark },
        }}
      >
        {verifying ? 'RETRYING...' : 'TRY AGAIN'}
      </Button>
    ),
  }

  return (
    <CustomDialogBox
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      title={
        <Typography component="div" sx={{ fontSize: '1.5rem', fontWeight: 500 }}>
          {titleByStep[step]}
        </Typography>
      }
      content={contentByStep[step]}
      actions={
        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          {actionsByStep[step]}
          <Button
            variant="outlined"
            onClick={handleClose}
            sx={{ flex: 1, borderRadius: '50px', fontWeight: 700, py: 1.5 }}
          >
            CLOSE
          </Button>
        </Box>
      }
    />
  )
}

function KeyCreatedDialog({
  token,
  onClose,
}: {
  token: string | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  if (!token) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <CustomDialogBox
      open={!!token}
      onClose={onClose}
      maxWidth="sm"
      titleText="View API Key"
      content={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2">
            Validation Completed. Copy this token now — it will not be shown
            again.
          </Typography>
          <Alert
            severity="warning"
            icon={<WarningAmberIcon />}
            sx={{ borderRadius: '8px', backgroundColor: '#FFF8E6' }}
          >
            Store this token securely. The secret cannot be retrieved after
            closing this dialog.
          </Alert>
          <PolicyField label="Key expiry" value="1 year from issuance" />
          <Box>
            <Typography
              variant="caption"
              sx={{ color: palette.greyText, mb: 0.5, display: 'block' }}
            >
              Full token string
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={token}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={copied ? 'Copied!' : 'Copy'} arrow>
                      <IconButton size="small" onClick={handleCopy}>
                        <ContentCopyIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
                sx: { fontFamily: 'monospace', fontSize: '0.8rem' },
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            />
          </Box>
        </Box>
      }
      actions={
        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <Button
            variant="contained"
            onClick={handleCopy}
            sx={{
              flex: 1,
              borderRadius: '50px',
              backgroundColor: palette.primary,
              fontWeight: 700,
              py: 1.5,
              '&:hover': { backgroundColor: palette.primaryDark },
            }}
          >
            {copied ? 'COPIED!' : 'COPY TOKEN'}
          </Button>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{ flex: 1, borderRadius: '50px', fontWeight: 700, py: 1.5 }}
          >
            CLOSE
          </Button>
        </Box>
      }
    />
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ApiKeyManagement() {
  const { status: sessionStatus } = useSession()
  const {
    data: rawCredentials,
    error: fetchError,
    isLoading,
  } = useSWR<ApiKeyCredential[]>(
    sessionStatus === 'authenticated' ? '/api/apikeys' : null,
    fetcher,
    { shouldRetryOnError: true, errorRetryCount: 3, errorRetryInterval: 1000 }
  )

  const [validatingSortKey, setValidatingSortKey] = useState<string | null>(null)

  const apiKeys: ApiKey[] = useMemo(
    () =>
      Array.isArray(rawCredentials)
        ? rawCredentials.map((cred) => {
            const row = toRow(cred)
            return row.sortKey === validatingSortKey
              ? { ...row, status: 'Validation' as const }
              : row
          })
        : [],
    [rawCredentials, validatingSortKey]
  )

  const [tabValue, setTabValue] = useState(0)
  const [search, setSearch] = useState('')
  const [viewTarget, setViewTarget] = useState<ApiKey | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)
  const [renewTarget, setRenewTarget] = useState<ApiKey | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{
    severity: 'success' | 'error' | 'warning' | 'info'
    title: string
    subtitle?: string
  } | null>(null)

  const showSnackbar = useCallback(
    (severity: 'success' | 'error' | 'warning' | 'info', title: string, subtitle?: string) => {
      setSnackbar({ severity, title, subtitle })
    },
    []
  )

  const filteredRows = useMemo(
    () =>
      apiKeys.filter((k) => {
        const q = search.toLowerCase()
        return (
          k.keyId.toLowerCase().includes(q) ||
          k.description.toLowerCase().includes(q) ||
          k.jurisdiction.toLowerCase().includes(q) ||
          k.environment.toLowerCase().includes(q)
        )
      }),
    [apiKeys, search]
  )

  const handleView = useCallback((key: ApiKey) => setViewTarget(key), [])
  const handleRevoke = useCallback((key: ApiKey) => setRevokeTarget(key), [])
  const handleRenew = useCallback((key: ApiKey) => setRenewTarget(key), [])

  const confirmRevoke = useCallback(async (reason?: string) => {
    if (!revokeTarget) return
    const { sortKey, jurisdiction } = revokeTarget
    setRevokeTarget(null)
    try {
      const res = await fetch('/api/apikeys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortKey, reason: reason || undefined }),
      })
      if (!res.ok) throw new Error('Failed to revoke key')
      mutate('/api/apikeys')
      showSnackbar('success', `${jurisdiction} API Key revoked`, 'This key can no longer be used.')
    } catch {
      showSnackbar('error', 'Failed to revoke key', 'Please try again.')
    }
  }, [revokeTarget, showSnackbar])

  // Centralized one-time token reveal — the JWT is never persisted; it's
  // deterministically regenerated here from claims fixed at creation, and
  // the credential is marked viewed atomically so it can never be retrieved
  // again through this endpoint. Used by create/renew/validate success AND
  // by the table's own View action for any Active key that hasn't been
  // viewed yet (e.g. the create/validate modal was closed before viewing).
  const revealToken = useCallback(async (sortKey: string) => {
    try {
      const res = await fetch('/api/apikeys/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortKey }),
      })
      const body = await res.json()
      if (!res.ok) {
        showSnackbar('error', 'Unable to retrieve key', body.error || 'Please try again.')
        return
      }
      mutate('/api/apikeys')
      setCreatedToken(body.token)
    } catch {
      showSnackbar('error', 'Unable to retrieve key', 'Network error.')
    }
  }, [showSnackbar])

  const handleRevealToken = useCallback((key: ApiKey) => {
    revealToken(key.sortKey)
  }, [revealToken])

  const handleValidateRow = useCallback(async (key: ApiKey) => {
    if (!key.domain) {
      showSnackbar('error', 'Unable to validate key', 'No DNS domain recorded for this key.')
      return
    }
    setValidatingSortKey(key.sortKey)
    try {
      const res = await fetch('/api/apikeys/verify-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: key.domain,
          envId: key.envRaw,
          sortKey: key.sortKey,
          jti: key.keyId,
          jurisdictionId: key.jurisdictionId,
        }),
      })
      const body = await res.json()
      mutate('/api/apikeys')
      if (!res.ok || !body.verified) {
        showSnackbar(
          'error',
          'DNS validation failed',
          body.error || "We couldn't find the expected DNS record."
        )
        return
      }
      showSnackbar('success', `${key.jurisdiction} API Key is active`, 'DNS domain successfully verified.')
    } catch {
      showSnackbar('error', 'DNS validation failed', 'Network error while validating domain.')
    } finally {
      setValidatingSortKey(null)
    }
  }, [showSnackbar])

  const handleCreateKey = useCallback(() => setCreateDialogOpen(true), [])

  const handleSearchChange = useCallback(
    (value: string) => setSearch(value),
    []
  )
  const handleTabChange = useCallback((value: number) => setTabValue(value), [])

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'description',
        headerName: 'DESCRIPTION',
        flex: 1.8,
        minWidth: 140,
        renderCell: (params: GridRenderCellParams) => (
          <Tooltip
            title={
              <>
                ID
                <br />
                {(params.row as ApiKey).keyId}
              </>
            }
            arrow
          >
            <Typography variant="body2" noWrap>
              {params.value}
            </Typography>
          </Tooltip>
        ),
      },
      {
        field: 'environment',
        headerName: 'ENVIRONMENT',
        flex: 1.2,
        minWidth: 120,
      },
      {
        field: 'jurisdiction',
        headerName: 'ORGANIZATION',
        flex: 1.5,
        minWidth: 130,
      },
      {
        field: 'status',
        headerName: 'STATUS',
        flex: 1.6,
        minWidth: 160,
        renderCell: (params: GridRenderCellParams) => (
          <StatusCell row={params.row as ApiKey} />
        ),
      },
      { field: 'created', headerName: 'CREATED', flex: 1, minWidth: 100 },
      { field: 'expires', headerName: 'EXPIRES', flex: 1, minWidth: 100 },
      {
        field: 'createdBy',
        headerName: 'CREATED BY',
        flex: 1.5,
        minWidth: 140,
      },
      {
        field: 'actions',
        headerName: 'ACTION',
        flex: 1.8,
        minWidth: 180,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams) => (
          <ActionCell
            row={params.row as ApiKey}
            onView={handleView}
            onRevoke={handleRevoke}
            onRenew={handleRenew}
            onValidate={handleValidateRow}
            onRevealToken={handleRevealToken}
            validating={validatingSortKey === (params.row as ApiKey).sortKey}
          />
        ),
      },
    ],
    [handleView, handleRevoke, handleRenew, handleValidateRow, handleRevealToken, validatingSortKey]
  )

  const toolbarProps = useMemo(
    () => ({
      search,
      onSearchChange: handleSearchChange,
      tabValue,
      onTabChange: handleTabChange,
    }),
    [search, handleSearchChange, tabValue, handleTabChange]
  )

  const footerProps = useMemo(
    () => ({ onCreateKey: handleCreateKey }),
    [handleCreateKey]
  )

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (fetchError) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error">Failed to load API key credentials.</Alert>
      </Box>
    )
  }

  return (
    <div>
      {/* Header card — identical to ConnectionsTable */}
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
          <Box sx={{ padding: 2 }}>
            <Typography sx={{ fontSize: '1.75rem', fontWeight: 700 }}>
              API key management
            </Typography>
            <Typography variant="body2" sx={{ color: palette.greyText }}>
              Monitor traffic, restrict permissions, and optimize your API
              keys from a single dashboard.
            </Typography>
          </Box>
        </Card>
      </Box>

      <Box sx={{ mt: 3 }}>
        <StatCards apiKeys={apiKeys} />
      </Box>

      <DataGrid
        sx={{
          ...dataGridCustom,
          '& .MuiDataGrid-row.row-validation': {
            backgroundColor: '#E8F0FE',
          },
        }}
        rows={tabValue === 0 ? filteredRows : []}
        columns={columns}
        getRowClassName={(params) =>
          (params.row as ApiKey).status === 'Validation' ? 'row-validation' : ''
        }
        autoHeight
        pageSizeOptions={[5, 25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
        disableRowSelectionOnClick
        disableColumnMenu
        disableColumnSelector
        disableDensitySelector
        density="comfortable"
        pagination
        slots={{
          toolbar: CustomToolbar,
          footer: CustomFooter,
          noRowsOverlay: () => (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                py: 6,
              }}
            >
              <Typography variant="body2" sx={{ color: palette.greyText }}>
                {tabValue === 1 ? 'Audit log coming soon.' : 'No rows'}
              </Typography>
            </Box>
          ),
        }}
        slotProps={{
          toolbar: toolbarProps as CustomToolbarProps,
          footer: footerProps as unknown as Record<string, unknown>,
        }}
      />

      <CustomSnackbar
        open={!!snackbar}
        severity={snackbar?.severity ?? 'info'}
        message={
          snackbar && (
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{snackbar.title}</Typography>
              {snackbar.subtitle && (
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {snackbar.subtitle}
                </Typography>
              )}
            </Box>
          )
        }
        onClose={() => setSnackbar(null)}
      />
      <ViewKeyDialog apiKey={viewTarget} onClose={() => setViewTarget(null)} />
      <RevokeDialog
        apiKey={revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={(reason) => confirmRevoke(reason)}
      />
      <RenewDialog
        apiKey={renewTarget}
        onClose={() => setRenewTarget(null)}
        onRenewed={revealToken}
      />
      <CreateKeyDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={revealToken}
      />
      <KeyCreatedDialog
        token={createdToken}
        onClose={() => setCreatedToken(null)}
      />
    </div>
  )
}
