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
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ListAltIcon from '@mui/icons-material/ListAlt'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import TuneIcon from '@mui/icons-material/Tune'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import CustomDialogBox from '../DialogBox/CustomDialogBox'
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
  status: 'Active' | 'Grace Period' | 'Revoked'
  created: string
  expires: string
  createdBy: string
  revokedAt: string | null
  graceExpiresAt: string | null
  expiresAtRaw: string | null
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
    environment: (() => {
      if (!cred.env) return '—'
      const code = isNaN(Number(cred.env)) ? cred.env.toUpperCase() : getEnvironmentName(Number(cred.env))
      return ENV_DISPLAY_NAMES[code] ?? code
    })(),
    jurisdiction: cred.jurisdictionDescription ?? cred.jurisdictionId,
    status: (cred.status === 'superseded'
      ? 'Active'
      : cred.status
      ? cred.status.replace(/\b\w/g, (c) => c.toUpperCase())
      : cred.status) as ApiKey['status'],
    created: formatDate(cred.createdOn),
    expires: formatDate(cred.expiresAt),
    createdBy: cred.createdBy ?? '—',
    revokedAt: cred.revokedAt ? formatDate(cred.revokedAt) : null,
    graceExpiresAt: cred.graceExpiresAt ? formatDate(cred.graceExpiresAt) : null,
    expiresAtRaw: cred.expiresAt ? cred.expiresAt.toISOString() : null,
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

function StatusCell({ status }: { status: ApiKey['status'] }) {
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Typography variant="body2">{status}</Typography>
        <Box
          sx={{
            width: 14,
            height: 14,
            borderRadius: '2px',
            backgroundColor: palette.error,
          }}
        />
      </Box>
    )
  }
  return (
    <Typography variant="body2" sx={{ color: palette.greyText }}>
      {status}
    </Typography>
  )
}

function ActionCell({
  row,
  onRevoke,
  onRenew,
}: {
  row: ApiKey
  onRevoke: (key: ApiKey) => void
  onRenew: (key: ApiKey) => void
}) {
  if (row.graceExpiresAt) {
    return (
      <Typography variant="body2" sx={{ color: palette.greyText }}>
        Grace period expires on {row.graceExpiresAt}
      </Typography>
    )
  }
  if (row.status === 'Revoked') {
    return (
      <Typography variant="body2" sx={{ color: palette.greyText }}>
        {row.revokedAt ? `Revoked at ${row.revokedAt}` : 'Revoked'}
      </Typography>
    )
  }
  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {row.status === 'Active' && (
        <Tooltip title="Renew key" arrow>
          <IconButton
            size="small"
            onClick={() => onRenew(row)}
            sx={{
              border: `1px solid ${palette.border}`,
              borderRadius: '50%',
              width: 32,
              height: 32,
            }}
          >
            <AutorenewIcon sx={{ fontSize: 18, color: palette.greyText }} />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Revoke key" arrow>
        <IconButton
          size="small"
          onClick={() => onRevoke(row)}
          sx={{
            border: `1px solid ${palette.border}`,
            borderRadius: '50%',
            width: 32,
            height: 32,
          }}
        >
          <RemoveCircleOutlineIcon
            sx={{ fontSize: 18, color: palette.error }}
          />
        </IconButton>
      </Tooltip>
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
          placeholder="Search..."
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
          sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0 } }}
        >
          <Tab
            icon={<VpnKeyIcon sx={{ fontSize: 16 }} />}
            label="KEYS"
            iconPosition="start"
            id="apikeys-tab-0"
            sx={{ fontWeight: 700, fontSize: '0.75rem' }}
          />
          <Tab
            icon={<ListAltIcon sx={{ fontSize: 16 }} />}
            label="AUDIT LOG"
            iconPosition="start"
            id="apikeys-tab-1"
            sx={{ fontWeight: 700, fontSize: '0.75rem' }}
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
  onCreated,
}: {
  apiKey: ApiKey | null
  onClose: () => void
  onCreated: (token: string) => void
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
      const { token } = await res.json()
      mutate('/api/apikeys')
      handleClose()
      onCreated(token)
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

function CreateKeyDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (token: string) => void
}) {
  const { status: sessionStatus } = useSession()
  const { data: jurisdictions } = useSWR<Jurisdiction[]>(
    sessionStatus === 'authenticated' ? '/api/jurisdictions' : null,
    fetcher
  )

  const [jurisdictionId, setJurisdictionId] = useState<string>('')
  const [envId, setEnvId] = useState<string>('')
  const [upn, setUpn] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!jurisdictionId || !envId || !upn.trim()) {
      setError('Please fill in all fields.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jurisdictionId, envId: Number(envId), upn: upn.trim(), description: description.trim() || undefined }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to create key')
      }
      const { token } = await res.json()
      mutate('/api/apikeys')
      setJurisdictionId('')
      setEnvId('')
      onClose()
      onCreated(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setJurisdictionId('')
    setEnvId('')
    setUpn('')
    setDescription('')
    setError(null)
    onClose()
  }

  return (
    <CustomDialogBox
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      titleText="Create API Key"
      content={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2">
            A signed JWT will be generated and stored. Copy it immediately — it
            will not be shown again.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ borderRadius: '8px' }}>
              {error}
            </Alert>
          )}
          <FormControl fullWidth size="small">
            <InputLabel id="create-key-jurisdiction-label">
              Jurisdiction
            </InputLabel>
            <Select
              labelId="create-key-jurisdiction-label"
              value={jurisdictionId}
              label="Jurisdiction"
              onChange={(e) => setJurisdictionId(e.target.value)}
              sx={{ borderRadius: '8px' }}
            >
              {Array.isArray(jurisdictions) &&
                jurisdictions.map((j) => (
                  <MenuItem
                    key={j.jurisdictionId}
                    value={String(j.jurisdictionId)}
                  >
                    {j.description || j.name || j.jurisdictionId}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel id="create-key-env-label">Environment</InputLabel>
            <Select
              labelId="create-key-env-label"
              value={envId}
              label="Environment"
              onChange={(e) => setEnvId(e.target.value)}
              sx={{ borderRadius: '8px' }}
            >
              {ENV_OPTIONS.map((opt) => (
                <MenuItem key={opt.id} value={String(opt.id)}>
                  {opt.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Description"
            placeholder="e.g. Massachusetts IIS production key"
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
            helperText="DNS domain validated at issuance — included in the JWT upn claim"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />
        </Box>
      }
      actions={
        <Button
          fullWidth
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !jurisdictionId || !envId || !upn.trim()}
          sx={{
            borderRadius: '50px',
            backgroundColor: palette.primary,
            fontWeight: 700,
            py: 1.5,
            '&:hover': { backgroundColor: palette.primaryDark },
          }}
        >
          {submitting ? 'CREATING...' : 'CREATE KEY'}
        </Button>
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
      titleText="Key Created"
      content={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2">
            Copy this token now — it will not be shown again.
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
        <Button
          fullWidth
          variant="contained"
          onClick={handleCopy}
          sx={{
            borderRadius: '50px',
            backgroundColor: palette.primary,
            fontWeight: 700,
            py: 1.5,
            '&:hover': { backgroundColor: palette.primaryDark },
          }}
        >
          {copied ? 'COPIED!' : 'COPY TOKEN'}
        </Button>
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

  const apiKeys: ApiKey[] = useMemo(
    () => (Array.isArray(rawCredentials) ? rawCredentials.map(toRow) : []),
    [rawCredentials]
  )

  const [tabValue, setTabValue] = useState(0)
  const [search, setSearch] = useState('')
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)
  const [renewTarget, setRenewTarget] = useState<ApiKey | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createdToken, setCreatedToken] = useState<string | null>(null)

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

  const handleRevoke = useCallback((key: ApiKey) => setRevokeTarget(key), [])
  const handleRenew = useCallback((key: ApiKey) => setRenewTarget(key), [])

  const confirmRevoke = useCallback(async (reason?: string) => {
    if (!revokeTarget) return
    const sortKey = revokeTarget.sortKey
    setRevokeTarget(null)
    try {
      const res = await fetch('/api/apikeys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortKey, reason: reason || undefined }),
      })
      if (!res.ok) throw new Error('Failed to revoke key')
      mutate('/api/apikeys')
    } catch {
      // silently fail; grid reflects real state on next SWR refresh
    }
  }, [revokeTarget])

  const handleRenewCreated = useCallback((token: string) => {
    setCreatedToken(token)
  }, [])

  const handleCreateKey = useCallback(() => setCreateDialogOpen(true), [])

  const handleSearchChange = useCallback(
    (value: string) => setSearch(value),
    []
  )
  const handleTabChange = useCallback((value: number) => setTabValue(value), [])

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'keyId',
        headerName: 'KEY ID',
        flex: 1.5,
        minWidth: 140,
        renderCell: (params: GridRenderCellParams) => (
          <Typography
            variant="body2"
            sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
          >
            {params.value}
          </Typography>
        ),
      },
      { field: 'description', headerName: 'DESCRIPTION', flex: 1.8, minWidth: 140 },
      {
        field: 'environment',
        headerName: 'ENVIRONMENT',
        flex: 1.2,
        minWidth: 120,
      },
      {
        field: 'jurisdiction',
        headerName: 'JURISDICTION',
        flex: 1.5,
        minWidth: 130,
      },
      {
        field: 'status',
        headerName: 'STATUS',
        flex: 1.2,
        minWidth: 120,
        renderCell: (params: GridRenderCellParams) => (
          <StatusCell status={params.value as ApiKey['status']} />
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
        flex: 1.5,
        minWidth: 160,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams) => (
          <ActionCell
            row={params.row as ApiKey}
            onRevoke={handleRevoke}
            onRenew={handleRenew}
          />
        ),
      },
    ],
    [handleRevoke, handleRenew]
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
          <Typography
            sx={{ padding: 2, fontSize: '1.75rem', fontWeight: 700 }}
            flexGrow={1}
            display="flex"
          >
            API Key Management
          </Typography>
        </Card>
      </Box>

      <DataGrid
        sx={dataGridCustom}
        rows={tabValue === 0 ? filteredRows : []}
        columns={columns}
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

      <RevokeDialog
        apiKey={revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={(reason) => confirmRevoke(reason)}
      />
      <RenewDialog
        apiKey={renewTarget}
        onClose={() => setRenewTarget(null)}
        onCreated={handleRenewCreated}
      />
      <CreateKeyDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={(token) => setCreatedToken(token)}
      />
      <KeyCreatedDialog
        token={createdToken}
        onClose={() => setCreatedToken(null)}
      />
    </div>
  )
}
