import React, { useState, useMemo, useCallback, useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Popover,
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
  GridComparatorFn,
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
import SearchableMultiSelect from '../Dropdown/SearchableMultiSelect'
import palette from '../../styles/theme/palette'
import { useSession } from 'next-auth/react'
import fetcher from '../../lib/fetch'
import { ApiKeyCredential } from '../../lib/type/ApiKeyCredential'
import { Jurisdiction } from '../../lib/type/Jurisdiction'
import useRoleAccess from '../../lib/security/useRoleAccess'
import hasAccessToDestId from '../../lib/accesshelper'
import { ApiKeyManagementPageAccessControl } from '../../lib/type/PageAccessControls'
import {
  ALLOWED_USE_TYPES,
  USE_TYPE_LABELS,
  AllowedUseType,
} from '../../lib/type/AllowedUseType'
import { getEnvironmentName, DEST_TYPES } from '../../lib/desttypehelper'

// Organizations dropdown data source.
function useOrganizations(sessionStatus: string): Jurisdiction[] | undefined {
  const { data } = useSWR<Jurisdiction[]>(
    sessionStatus === 'authenticated' ? '/api/jurisdictions' : null,
    fetcher
  )
  return data
}

const ENV_DISPLAY_NAMES: Record<string, string> = {
  PRODUCTION: 'Production',
  TEST: 'Testing',
  ONBOARD: 'Onboarding',
  STAGE: 'Staging',
  DEV: 'Development',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiKeyFilters {
  environment: string
  status: string
  organization: string
}

// A filter dropdown option. `value` is what gets stored in filter state and
// matched against a row (a stable key, e.g. a jurisdictionId); `label` is the
// human-readable text shown in the menu.
interface FilterOption {
  value: string
  label: string
}

const EMPTY_FILTERS: ApiKeyFilters = {
  environment: '',
  status: '',
  organization: '',
}

interface ApiKey {
  id: string
  keyId: string
  sortKey: string
  description: string
  environment: string
  // Raw environment ids (e.g. [4, 5]) and use types, carried alongside the
  // display string so flows that re-submit a key's scope (re-issue) don't have
  // to reverse-map the display name.
  environments: number[]
  useTypes: AllowedUseType[]
  jurisdiction: string
  jurisdictionId: string
  domain: string | null
  status: 'Active' | 'Ready for Validation' | 'Validation' | 'Grace Period' | 'Revoked' | 'Cancelled' | string
  // The record's actual persisted `status`, alongside the (possibly derived)
  // display `status` above. See `pendingSweeperSync`.
  rawStatus: string
  // True only for the one case where "Grace Period" is displayed even though
  // the 10-business-day grace window has structurally ended: the Hub treats
  // `grace_period` as usable (D6 `isUsableStatus`) until its own
  // GracePeriodRevocationScheduler actually flips the stored status to
  // `revoked`, so claiming "Revoked" ahead of that write would assert a DB
  // state that may not be true yet — the credential can still work
  // (design.md Risks: "an aged-out key stays Hub-usable until its JWT exp").
  // Deliberately NOT set for "Expired": the Hub independently rejects an
  // expired JWT on its own `exp` claim regardless of DB status (D13), so
  // deriving Expired ahead of any sweeper is always safe (test-plan §9.1).
  pendingSweeperSync: boolean
  created: string
  // Raw ISO timestamp alongside the locale-formatted `created` display string,
  // so the grid can sort chronologically — the formatted string has no time
  // component and sorts incorrectly across months (lexical, not chronological).
  createdOnRaw: string | null
  expires: string
  createdBy: string
  revokedAt: string | null
  cancelledAt: string | null
  graceExpiresAt: string | null
  expiresAtRaw: string | null
  viewed: boolean
  // Set once this (Expired) credential has already been re-issued — gates
  // the row's Re-issue action so it can't be offered again (the underlying
  // guard is server-side/atomic; this just keeps the UI from inviting an
  // action that will now always 409). See test-plan re-issue guard.
  reissuedAs: string | undefined
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}

// Client-side mirror of the server's `ownsJurisdiction` check
// (lib/security/apiKeyAuthz), used to scope jurisdiction-bearing UI lists: the
// Create dialog's Organization dropdown and the dashboard's Organization filter.
//
// Matched on `prefix` (the jurisdiction's short code, e.g. "AINQ") because that
// is what Okta group membership — and therefore `session.user.jurisdictions` — is
// keyed on. NOT `jurisdictionId` (numeric, a different identifier space) and NOT
// `name` (the long form, e.g. "Audacious Inquiry (operators)"). IZG
// Operations/Support are global and short-circuit inside `hasAccessToDestId`.
//
// Fails closed: no session, no prefix, or a throw (non-admin with no assigned
// jurisdictions) all mean "not owned". This is UI scoping only — the API routes
// remain the authoritative gate.
type SessionLike =
  | { user?: { role?: string; jurisdictions?: string[] } }
  | null
  | undefined

function ownsJurisdictionForUi(
  jurisdiction: Jurisdiction,
  session: SessionLike
): boolean {
  if (!session || !jurisdiction.prefix) return false
  try {
    return hasAccessToDestId(String(jurisdiction.prefix), session)
  } catch {
    return false
  }
}

// A credential's raw environment id is a number, or, for legacy rows, a
// string name ("DEV") — normalize either to its display name.
function envDisplayName(raw: number | string): string {
  if (typeof raw === 'number') {
    const code = getEnvironmentName(raw)
    return ENV_DISPLAY_NAMES[code] ?? code
  }
  const code = isNaN(Number(raw)) ? raw.toUpperCase() : getEnvironmentName(Number(raw))
  return ENV_DISPLAY_NAMES[code] ?? code
}

// Derives the display status from expiry/grace timestamps rather than always
// waiting on the Hub's own writes — but the two derivable outcomes are NOT
// equally trustworthy ahead of the DB (design.md D5/D6/D13, Risks):
//
//  - "Expired" is always safe to derive immediately: the Hub independently
//    rejects an expired JWT on its own `exp` claim regardless of what's
//    stored (D13), so there is no scenario where the console says Expired
//    but the credential still works.
//  - "Revoked" is NOT safe to derive: `grace_period` is itself a Hub-usable
//    status (D6 `isUsableStatus`) for as long as it's stored — only the
//    Hub's own GracePeriodRevocationScheduler actually ends that by writing
//    `revoked`. If that sweeper is stuck (e.g. failing to parse an unrelated
//    row and bailing out entirely — test-plan §9.1), a key past its 10-day
//    grace window but short of its JWT `exp` may still be fully usable at
//    the Hub even though nothing has revoked it yet. So this case trusts the
//    stored status (still "Grace Period") instead of asserting "Revoked",
//    and flags it via `pendingSweeperSync` so the UI can say the window has
//    ended without claiming a DB state that may not exist.
function computeDisplayStatus(
  cred: ApiKeyCredential
): { status: string; pendingSweeperSync: boolean } {
  const now = Date.now()
  const exp = cred.expiresAt ? new Date(cred.expiresAt).getTime() : null
  const graceEnd = cred.graceExpiresAt ? new Date(cred.graceExpiresAt).getTime() : null

  // Explicit terminal stored statuses always win — a user revoke/cancel or
  // a grace-period sweeper that has already persisted the final status.
  if (cred.status === 'revoked') return { status: 'Revoked', pendingSweeperSync: false }
  if (cred.status === 'cancelled') return { status: 'Cancelled', pendingSweeperSync: false }
  if (cred.status === 'expired') return { status: 'Expired', pendingSweeperSync: false }

  // Renewed key in/past its grace period. The JWT `exp` caps effective
  // validity, so the effective grace end is min(graceExpiresAt, exp).
  if (graceEnd !== null) {
    const effectiveGraceEnd = exp !== null ? Math.min(graceEnd, exp) : graceEnd
    if (now < effectiveGraceEnd) return { status: 'Grace Period', pendingSweeperSync: false }
    if (exp !== null && exp <= graceEnd) {
      // The JWT itself has expired first — safe, see comment above.
      return { status: 'Expired', pendingSweeperSync: false }
    }
    // Grace window has structurally elapsed but the JWT hasn't — do not
    // assert "Revoked" ahead of the sweeper; trust the stored status.
    return { status: 'Grace Period', pendingSweeperSync: true }
  }

  // Non-renewed key past its hard expiry — safe, see comment above.
  if (exp !== null && now >= exp) {
    return { status: 'Expired', pendingSweeperSync: false }
  }

  if (cred.status === 'ready_for_validation') {
    return { status: 'Ready for Validation', pendingSweeperSync: false }
  }
  if (cred.status === 'active') return { status: 'Active', pendingSweeperSync: false }
  return {
    status: cred.status
      ? cred.status.replace(/\b\w/g, (c) => c.toUpperCase())
      : cred.status,
    pendingSweeperSync: false,
  }
}

function toRow(cred: ApiKeyCredential): ApiKey {
  const { status, pendingSweeperSync } = computeDisplayStatus(cred)
  return {
    id: cred.jti,
    keyId: cred.jti,
    sortKey: cred.sortKey,
    description: cred.description ?? '—',
    jurisdictionId: cred.jurisdictionId,
    domain: cred.domain ?? null,
    // Multi-env credentials (IZG Operations only) display every environment,
    // comma-separated; standard credentials show their single environment.
    environment:
      cred.environments && cred.environments.length
        ? cred.environments.map(envDisplayName).join(', ')
        : '—',
    environments: cred.environments ?? [],
    useTypes: cred.useTypes ?? [],
    // Both fields are typed as always-present, but a malformed/legacy row (e.g.
    // missing jurisdictionId) can violate that at runtime — DynamoDB is
    // schemaless. Falling back to '—' keeps this a renderable string so the
    // grid (and the search filter's `.toLowerCase()`) never crashes on it.
    jurisdiction: cred.jurisdictionDescription ?? cred.jurisdictionId ?? '—',
    status,
    rawStatus: cred.status,
    pendingSweeperSync,
    created: formatDate(cred.createdOn),
    createdOnRaw: (() => {
      if (!cred.createdOn) return null
      const d = new Date(cred.createdOn)
      return isNaN(d.getTime()) ? null : d.toISOString()
    })(),
    expires: formatDate(cred.expiresAt),
    createdBy: cred.createdBy ?? '—',
    revokedAt: cred.revokedAt ? formatDate(cred.revokedAt) : null,
    cancelledAt: cred.cancelledAt ? formatDate(cred.cancelledAt) : null,
    // Displayed grace end is capped at the hard expiry — a token can't outlive
    // its `exp` claim regardless of the stored 10-business-day grace date.
    graceExpiresAt: (() => {
      if (!cred.graceExpiresAt) return null
      const g = new Date(cred.graceExpiresAt)
      const e = cred.expiresAt ? new Date(cred.expiresAt) : null
      return formatDate(e && e < g ? e : g)
    })(),
    expiresAtRaw: (() => {
      if (!cred.expiresAt) return null
      const d = new Date(cred.expiresAt)
      return isNaN(d.getTime()) ? null : d.toISOString()
    })(),
    viewed: !!cred.viewedAt,
    reissuedAs: cred.reissuedAs,
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Typography variant="body2" sx={{ color: palette.warning ?? '#ed6c02' }}>
          {row.graceExpiresAt
            ? row.pendingSweeperSync
              ? `Grace period ended ${row.graceExpiresAt}`
              : `Grace period expires on ${row.graceExpiresAt}`
            : 'Grace Period'}
        </Typography>
        {row.pendingSweeperSync && <GraceSweeperOverdueIndicator rawStatus={row.rawStatus} />}
      </Box>
    )
  }
  return (
    <Typography variant="body2" sx={{ color: palette.greyText }}>
      {status}
    </Typography>
  )
}

// Surfaced only when `pendingSweeperSync` is set (see its definition on
// `ApiKey`) — the 10-day grace window has structurally ended, but the stored
// status is still `grace_period` (`rawStatus`) rather than `revoked`. Unlike
// Expired, that's not something the console can safely assert on its own —
// `grace_period` is itself a Hub-usable status until its own background
// sweeper flips it, so the credential may genuinely still work
// (test-plan §9.1).
function GraceSweeperOverdueIndicator({ rawStatus }: { rawStatus: string }) {
  return (
    <Tooltip
      arrow
      title={`The 10-business-day grace window has ended, but the stored status is still "${rawStatus}" — the Hub treats grace_period as usable until its background revocation sweeper actually revokes it. This key may still work; don't assume it's rejected until the stored status changes to revoked.`}
    >
      <WarningAmberIcon sx={{ fontSize: 16, color: palette.warning ?? '#ed6c02' }} />
    </Tooltip>
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
  onCancel,
  onRenew,
  onReissue,
  onValidate,
  onRevealToken,
  validating,
  renewing,
  reissuing,
  canRevoke,
  canRenew,
  canCancel,
}: {
  row: ApiKey
  onView: (key: ApiKey) => void
  onRevoke: (key: ApiKey) => void
  onCancel: (key: ApiKey) => void
  onRenew: (key: ApiKey) => void
  onReissue: (key: ApiKey) => void
  onValidate: (key: ApiKey) => void
  onRevealToken: (key: ApiKey) => void
  validating: boolean
  renewing: boolean
  reissuing: boolean
  canRevoke: boolean
  canRenew: boolean
  canCancel: boolean
}) {
  if (row.status === 'Revoked') {
    return (
      <Typography variant="body2" sx={{ color: palette.greyText }}>
        {row.revokedAt ? `Revoked ${row.revokedAt}` : 'Revoked'}
      </Typography>
    )
  }

  if (row.status === 'Cancelled') {
    return (
      <Typography variant="body2" sx={{ color: palette.greyText }}>
        {row.cancelledAt ? `Cancelled ${row.cancelledAt}` : 'Cancelled'}
      </Typography>
    )
  }

  if (row.status === 'Expired') {
    // Expired keys can be re-issued (Q8): a fresh key, same scope, no grace
    // overlap. Gated on the renew capability. Unlike renew, re-issue never
    // changes this row's own `status` (D13 — nothing to overlap with a dead
    // key), so `reissuedAs` is the only signal that it's already been used —
    // hide the action once set, rather than leaving an action that would now
    // just 409 every time.
    if (row.reissuedAs) {
      return (
        <Typography variant="body2" sx={{ color: palette.greyText }}>
          {row.expires ? `Expired ${row.expires} — re-issued` : 'Expired — re-issued'}
        </Typography>
      )
    }
    return canRenew ? (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <ActionIconButton
          title={reissuing ? 'Re-issue in progress…' : 'Re-issue key'}
          onClick={() => onReissue(row)}
          disabled={reissuing}
        >
          <AutorenewIcon sx={{ fontSize: 'inherit' }} />
        </ActionIconButton>
      </Box>
    ) : (
      <Typography variant="body2" sx={{ color: palette.greyText }}>
        {row.expires ? `Expired ${row.expires}` : 'Expired'}
      </Typography>
    )
  }

  if (row.status === 'Grace Period') {
    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {canRevoke && (
          <ActionIconButton title="Revoke key" onClick={() => onRevoke(row)} color={palette.error}>
            <RemoveCircleOutlineIcon sx={{ fontSize: 'inherit' }} />
          </ActionIconButton>
        )}
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
        {canCancel && (
          <ActionIconButton title="Cancel key" onClick={() => onCancel(row)} color={palette.error}>
            <RemoveCircleOutlineIcon sx={{ fontSize: 'inherit' }} />
          </ActionIconButton>
        )}
      </Box>
    )
  }

  if (row.status === 'Validation') {
    return (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <ActionIconButton title="View key" onClick={() => onView(row)} color={palette.primary}>
          <VisibilityIcon sx={{ fontSize: 'inherit' }} />
        </ActionIconButton>
        {canCancel && (
          <ActionIconButton title="Cancel key" onClick={() => onCancel(row)} color={palette.error}>
            <RemoveCircleOutlineIcon sx={{ fontSize: 'inherit' }} />
          </ActionIconButton>
        )}
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
      {canRenew && (
        <ActionIconButton
          title={renewing ? 'Renewal in progress…' : 'Renew key'}
          onClick={() => onRenew(row)}
          disabled={renewing}
        >
          <AutorenewIcon sx={{ fontSize: 'inherit' }} />
        </ActionIconButton>
      )}
      {canRevoke && (
        <ActionIconButton title="Revoke key" onClick={() => onRevoke(row)} color={palette.error}>
          <RemoveCircleOutlineIcon sx={{ fontSize: 'inherit' }} />
        </ActionIconButton>
      )}
    </Box>
  )
}

// ─── Toolbar — hoisted outside main component, receives props via slotProps ───

interface CustomToolbarProps extends GridToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  tabValue: number
  onTabChange: (value: number) => void
  filters: ApiKeyFilters
  onFiltersChange: (filters: ApiKeyFilters) => void
  environmentOptions: FilterOption[]
  statusOptions: FilterOption[]
  organizationOptions: FilterOption[]
}

function CustomToolbar({
  search,
  onSearchChange,
  tabValue,
  onTabChange,
  filters,
  onFiltersChange,
  environmentOptions,
  statusOptions,
  organizationOptions,
}: CustomToolbarProps) {
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null)
  const activeFilterCount =
    (filters.environment ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.organization ? 1 : 0)

  const setFilter = (key: keyof ApiKeyFilters, value: string) =>
    onFiltersChange({ ...filters, [key]: value })

  const renderFilterSelect = (
    label: string,
    key: keyof ApiKeyFilters,
    options: FilterOption[]
  ) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography
        variant="caption"
        sx={{ fontWeight: 600, color: palette.greyText }}
      >
        {label}
      </Typography>
      <Select
        size="small"
        value={filters[key]}
        onChange={(e) => setFilter(key, e.target.value)}
        displayEmpty
        sx={{ borderRadius: '8px', minWidth: 220 }}
        renderValue={(v) => {
          if (!v) return <Box sx={{ color: palette.greyText }}>All</Box>
          const selected = options.find((o) => o.value === v)
          return selected ? selected.label : (v as string)
        }}
      >
        <MenuItem value="">All</MenuItem>
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </Box>
  )

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
          <Badge badgeContent={activeFilterCount} color="primary">
            <Button
              variant="text"
              startIcon={<TuneIcon />}
              onClick={(e) => setFilterAnchor(e.currentTarget)}
              sx={{
                borderRadius: '24px',
                padding: '8px 16px',
                textTransform: 'none',
                fontWeight: 500,
                color: palette.greyDarkTypography,
                backgroundColor: activeFilterCount ? '#E8F0FE' : 'transparent',
              }}
            >
              Filters
            </Button>
          </Badge>
        </Box>
      </Box>

      <Popover
        open={Boolean(filterAnchor)}
        anchorEl={filterAnchor}
        onClose={() => setFilterAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { sx: { borderRadius: '12px', p: 2, mt: 1, minWidth: 260 } },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography sx={{ fontWeight: 700 }}>Filters</Typography>
            <Button
              size="small"
              onClick={() => onFiltersChange(EMPTY_FILTERS)}
              disabled={activeFilterCount === 0}
              sx={{ textTransform: 'none' }}
            >
              Clear all
            </Button>
          </Box>
          {renderFilterSelect('Environment', 'environment', environmentOptions)}
          {renderFilterSelect('Status', 'status', statusOptions)}
          {renderFilterSelect('Organization', 'organization', organizationOptions)}
        </Box>
      </Popover>

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
  canCreate: boolean
}

function CustomFooter({ onCreateKey, canCreate }: CustomFooterProps) {
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
      {canCreate ? (
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
      ) : (
        // Keep the footer's space-between layout intact when the Create action
        // is hidden for the current role.
        <Box />
      )}
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

function CancelDialog({
  apiKey,
  onClose,
  onConfirm,
}: {
  apiKey: ApiKey | null
  onClose: () => void
  onConfirm: () => void
}) {
  if (!apiKey) return null
  return (
    <CustomDialogBox
      open={!!apiKey}
      onClose={onClose}
      maxWidth="sm"
      titleText="Cancel API Key Request"
      content={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2">
            Cancel the pending request for{' '}
            <strong>
              {apiKey.jurisdiction} | {apiKey.keyId}
            </strong>
            ?
          </Typography>
          <Typography variant="body2" sx={{ color: palette.greyText }}>
            This key has not been activated yet, so nothing is using it. The
            pending request will be cancelled and hidden from the default
            list; the record is retained for audit.
          </Typography>
        </Box>
      }
      actions={
        <Button
          fullWidth
          variant="outlined"
          onClick={onConfirm}
          sx={{ borderRadius: '50px', fontWeight: 700, py: 1.5 }}
        >
          CONFIRM CANCELLATION
        </Button>
      }
    />
  )
}

function RenewDialog({
  apiKey,
  onClose,
  onRenewed,
  onSubmittingChange,
}: {
  apiKey: ApiKey | null
  onClose: () => void
  onRenewed: (sortKey: string, jurisdiction: string) => void
  // Mirrors this row's in-flight state up to the parent so the row's OWN
  // Renew icon can be disabled the instant submission starts (defense in
  // depth alongside the dialog's own disabled button + modal backdrop, and
  // the server-side atomic guard that's the real enforcement — see
  // test-plan §6.8).
  onSubmittingChange?: (sortKey: string, submitting: boolean) => void
}) {
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!apiKey) return null

  // The renewed key keeps the same DNS domain as the key being renewed, so it
  // is carried over read-only rather than re-entered.
  const domain = apiKey.domain?.trim() ?? ''

  const handleClose = () => {
    setDescription('')
    setError(null)
    onClose()
  }

  const handleConfirm = async () => {
    if (!domain) {
      setError('This key has no DNS domain on record and cannot be renewed.')
      return
    }
    setSubmitting(true)
    setError(null)
    onSubmittingChange?.(apiKey.sortKey, true)
    try {
      // The server derives the renewed key's environment(s) from the
      // credential being renewed — it is not sent from the client.
      const res = await fetch('/api/apikeys/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldSortKey: apiKey.sortKey,
          oldExpiresAt: apiKey.expiresAtRaw,
          jurisdictionId: apiKey.jurisdictionId,
          upn: domain,
          description: description.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        // The row's cached status may be stale here — e.g. this credential
        // was already renewed by another session/tab, or lost the atomic
        // race to a concurrent renew request (test-plan §6.8, server-side
        // guaranteed by `supersedeApiKeyCredential`'s conditional write).
        // Refresh so the grid stops offering a Renew action that would just
        // 409 again, instead of only refreshing on the success path.
        mutate('/api/apikeys')
        throw new Error(
          res.status === 409
            ? 'This key is no longer active — it may have already been renewed. Close this dialog to see its current status.'
            : body.error || 'Failed to renew key'
        )
      }
      const { sortKey } = await res.json()
      const jurisdiction = apiKey.jurisdiction
      mutate('/api/apikeys')
      handleClose()
      onRenewed(sortKey, jurisdiction)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to renew key')
    } finally {
      setSubmitting(false)
      onSubmittingChange?.(apiKey.sortKey, false)
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
            value={domain}
            fullWidth
            size="small"
            InputProps={{ readOnly: true }}
            helperText="Carried over from the existing key — cannot be changed on renewal"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                backgroundColor: palette.greyLight,
              },
              '& .MuiInputBase-input': { color: palette.greyDarkTypography },
            }}
          />
        </Box>
      }
      actions={
        <Button
          fullWidth
          variant="outlined"
          onClick={handleConfirm}
          disabled={submitting || !domain}
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

type ReissueStep = 'confirm' | 'challenge' | 'failure'

// Re-issue (IGDD-3140 Q8) — the action offered on EXPIRED keys. Unlike renew,
// there is no grace-period overlap (the old key is already dead) and the new
// key gets a fresh 1-year expiry from issuance. It reuses the create +
// verify-domain endpoints: if the key's domain is still authorized it issues a
// fresh active key immediately; if that authorization has lapsed it runs the
// DNS TXT challenge first, then activates. Prefilled + read-only, like renew.
function ReissueDialog({
  apiKey,
  onClose,
  onReissued,
  onSubmittingChange,
}: {
  apiKey: ApiKey | null
  onClose: () => void
  onReissued: (sortKey: string, jurisdiction: string) => void
  // Mirrors this row's in-flight state up to the parent (see RenewDialog's
  // identical prop) so the row's OWN Re-issue icon can be disabled the
  // instant submission starts.
  onSubmittingChange?: (sortKey: string, submitting: boolean) => void
}) {
  const [step, setStep] = useState<ReissueStep>('confirm')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [challenge, setChallenge] = useState<{
    sortKey: string
    jti: string
    txtRecord: string
    txtValue: string
    domain: string
  } | null>(null)

  if (!apiKey) return null

  const domain = apiKey.domain?.trim() ?? ''
  const jurisdictionId = apiKey.jurisdictionId
  const environments = apiKey.environments
  const useTypes = apiKey.useTypes

  const handleClose = () => {
    setStep('confirm')
    setDescription('')
    setSubmitting(false)
    setVerifying(false)
    setError(null)
    setChallenge(null)
    onClose()
  }

  const finish = (sortKey: string) => {
    const jurisdiction = apiKey.jurisdiction
    mutate('/api/apikeys')
    handleClose()
    onReissued(sortKey, jurisdiction)
  }

  const handleReissue = async () => {
    if (!domain) {
      setError('This key has no DNS domain on record and cannot be re-issued.')
      return
    }
    if (!useTypes.length) {
      setError('This key has no use types on record and cannot be re-issued.')
      return
    }
    setSubmitting(true)
    setError(null)
    onSubmittingChange?.(apiKey.sortKey, true)
    try {
      // Is the domain still authorized (and unexpired) for every one of the
      // key's environments? /api/apikeys/domains returns exactly the
      // authorized+unexpired intersection the create 'existing' path accepts,
      // so it is a reliable predictor of which path will succeed.
      const domainsRes = await fetch(
        `/api/apikeys/domains?envId=${environments.join(',')}&jurisdictionId=${jurisdictionId}`
      )
      const authorizedDomains: { domain: string }[] = domainsRes.ok
        ? await domainsRes.json()
        : []
      const stillAuthorized = authorizedDomains.some((d) => d.domain === domain)

      const res = await fetch('/api/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jurisdictionId,
          environments,
          upn: domain,
          useTypes,
          description: description.trim() || undefined,
          dnsChoice: stillAuthorized ? 'existing' : 'other',
          // Lets the server enforce "re-issue at most once" atomically — see
          // markApiKeyCredentialReissued. Without this the server has no way
          // to tell this apart from an unrelated brand-new key creation.
          reissuedFrom: apiKey.sortKey,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        // The row's cached state may be stale — e.g. this expired key was
        // already re-issued (by this dialog on an earlier click, or another
        // session/tab). Refresh so the grid stops offering a Re-issue action
        // that would just 409 again.
        mutate('/api/apikeys')
        throw new Error(
          res.status === 409
            ? 'This key has already been re-issued. Close this dialog to see its current status.'
            : body.error || 'Failed to re-issue key'
        )
      }
      if (stillAuthorized) {
        // 201 — a fresh active key was issued immediately.
        finish(body.sortKey)
      } else {
        // 202 — the domain authorization has lapsed; a DNS challenge is
        // required before the new key can be activated.
        setChallenge({
          sortKey: body.sortKey,
          jti: body.jti,
          txtRecord: body.txtRecord,
          txtValue: body.txtValue,
          domain: body.domain,
        })
        setStep('challenge')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to re-issue key')
    } finally {
      setSubmitting(false)
      onSubmittingChange?.(apiKey.sortKey, false)
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
          sortKey: challenge.sortKey,
          jti: challenge.jti,
          jurisdictionId,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.verified) {
        mutate('/api/apikeys')
        setError(body.error || "We couldn't find the expected record.")
        setStep('failure')
        return
      }
      finish(challenge.sortKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      setStep('failure')
    } finally {
      setVerifying(false)
    }
  }

  const primaryBtnSx = {
    flex: 1,
    borderRadius: '50px',
    backgroundColor: palette.primary,
    fontWeight: 700,
    py: 1.5,
    '&:hover': { backgroundColor: palette.primaryDark },
  }

  const confirmContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2">
        This key expired
        {apiKey.expires && apiKey.expires !== '—' ? ` on ${apiKey.expires}` : ''}.
        A new key will be issued with the same scope, valid for{' '}
        <strong>1 year</strong> from issuance. The expired key is not reactivated.
      </Typography>
      <Typography variant="body2" sx={{ color: palette.greyText }}>
        If this domain’s authorization has lapsed, you’ll be asked to re-verify
        it via DNS before the new key is issued.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <PolicyField label="Jurisdiction" value={apiKey.jurisdiction} />
        <PolicyField label="Environment" value={apiKey.environment} />
      </Box>
      <PolicyField
        label="Use Types"
        value={useTypes.map((u) => USE_TYPE_LABELS[u] ?? u).join(', ') || '—'}
      />
      {error && (
        <Alert severity="error" sx={{ borderRadius: '8px' }}>
          {error}
        </Alert>
      )}
      <TextField
        label="Description (optional)"
        placeholder="e.g. Massachusetts IIS production key — re-issue"
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
        value={domain}
        fullWidth
        size="small"
        InputProps={{ readOnly: true }}
        helperText="Carried over from the expired key — cannot be changed"
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            backgroundColor: palette.greyLight,
          },
          '& .MuiInputBase-input': { color: palette.greyDarkTypography },
        }}
      />
    </Box>
  )

  const challengeContent = challenge && (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2">
        This domain’s authorization has lapsed. Add the following DNS TXT record
        at your DNS provider to re-verify ownership, then validate:
      </Typography>
      <Box sx={{ backgroundColor: palette.greyLight, borderRadius: '8px', p: 2 }}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {challenge.txtRecord} → &quot;{challenge.txtValue}&quot;
        </Typography>
      </Box>
      <Alert severity="info" sx={{ borderRadius: '8px' }}>
        DNS changes may take up to 48 hours to propagate.
      </Alert>
    </Box>
  )

  const failureContent = challenge && (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" sx={{ color: palette.greyDarkTypography }}>
        We couldn&apos;t find the expected record. Add this TXT record and try
        again:
      </Typography>
      <Box sx={{ backgroundColor: '#FDECEA', borderRadius: '8px', p: 2 }}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {challenge.txtRecord} → &quot;{challenge.txtValue}&quot;
        </Typography>
      </Box>
      {error && (
        <Alert severity="warning" sx={{ borderRadius: '8px' }}>
          {error}
        </Alert>
      )}
    </Box>
  )

  const titleByStep: Record<ReissueStep, React.ReactNode> = {
    confirm: 'Re-issue API Key',
    challenge: 'Re-verify Domain Ownership',
    failure: (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon sx={{ fontSize: 28, color: palette.error }} />
        <span>Validation Failed</span>
      </Box>
    ),
  }

  const contentByStep: Record<ReissueStep, React.ReactNode> = {
    confirm: confirmContent,
    challenge: challengeContent,
    failure: failureContent,
  }

  const actionsByStep: Record<ReissueStep, React.ReactNode> = {
    confirm: (
      <Button
        variant="contained"
        onClick={handleReissue}
        disabled={submitting || !domain}
        sx={primaryBtnSx}
      >
        {submitting ? 'RE-ISSUING...' : 'RE-ISSUE KEY'}
      </Button>
    ),
    challenge: (
      <Button
        variant="contained"
        onClick={handleValidate}
        disabled={verifying}
        sx={primaryBtnSx}
      >
        {verifying ? 'VALIDATING...' : 'VALIDATE'}
      </Button>
    ),
    failure: (
      <Button
        variant="contained"
        onClick={handleValidate}
        disabled={verifying}
        sx={primaryBtnSx}
      >
        {verifying ? 'RETRYING...' : 'TRY AGAIN'}
      </Button>
    ),
  }

  return (
    <CustomDialogBox
      open={!!apiKey}
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

type ValidateStep = 'loading' | 'challenge' | 'error'

// Row-level "Validate domain" action for a Ready for Validation credential.
// Previously this fired straight off a blind POST to /verify-domain with no
// way to see the TXT record/value again — if the challenge shown at create
// time was never copied (dialog closed early, page refreshed, etc.) the
// credential was effectively stuck, since nothing re-displayed it (test-plan
// §3.7). This re-fetches the still-pending challenge from persisted state
// (GET /verify-domain) before offering VALIDATE, so it can always be viewed
// again. Submit behavior (success/failure snackbar + row refresh) is
// otherwise unchanged from before — that's still owned by the caller-supplied
// `onValidate`.
function ValidateChallengeDialog({
  apiKey,
  onClose,
  onValidate,
}: {
  apiKey: ApiKey | null
  onClose: () => void
  onValidate: (key: ApiKey) => Promise<void>
}) {
  const [step, setStep] = useState<ValidateStep>('loading')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [challenge, setChallenge] = useState<{
    txtRecord: string
    txtValue: string
  } | null>(null)

  useEffect(() => {
    if (!apiKey) return
    let cancelled = false
    setStep('loading')
    setError(null)
    setChallenge(null)
    ;(async () => {
      try {
        const res = await fetch(
          `/api/apikeys/verify-domain?sortKey=${encodeURIComponent(apiKey.sortKey)}`
        )
        const body = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setError(body.error || 'Unable to load the DNS challenge for this key.')
          setStep('error')
          return
        }
        setChallenge({ txtRecord: body.txtRecord, txtValue: body.txtValue })
        setStep('challenge')
      } catch {
        if (!cancelled) {
          setError('Network error while loading the DNS challenge.')
          setStep('error')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiKey])

  if (!apiKey) return null

  const handleClose = () => {
    setStep('loading')
    setVerifying(false)
    setError(null)
    setChallenge(null)
    onClose()
  }

  const handleSubmit = async () => {
    setVerifying(true)
    try {
      await onValidate(apiKey)
    } finally {
      setVerifying(false)
      handleClose()
    }
  }

  const primaryBtnSx = {
    flex: 1,
    borderRadius: '50px',
    backgroundColor: palette.primary,
    fontWeight: 700,
    py: 1.5,
    '&:hover': { backgroundColor: palette.primaryDark },
  }

  const loadingContent = (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
      <CircularProgress size={28} />
    </Box>
  )

  const challengeContent = challenge && (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2">
        Add the following DNS TXT record at your DNS provider to prove
        ownership of this domain, then validate:
      </Typography>
      <Box sx={{ backgroundColor: palette.greyLight, borderRadius: '8px', p: 2 }}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {challenge.txtRecord} → &quot;{challenge.txtValue}&quot;
        </Typography>
      </Box>
      <Alert severity="info" sx={{ borderRadius: '8px' }}>
        DNS changes may take up to 48 hours to propagate.
      </Alert>
    </Box>
  )

  const errorContent = (
    <Alert severity="error" sx={{ borderRadius: '8px' }}>
      {error}
    </Alert>
  )

  const stepTitle: Record<ValidateStep, string> = {
    loading: 'Verify Domain Ownership',
    challenge: 'Verify Domain Ownership',
    error: 'Unable to Load Challenge',
  }

  const stepContent: Record<ValidateStep, React.ReactNode> = {
    loading: loadingContent,
    challenge: challengeContent,
    error: errorContent,
  }

  return (
    <CustomDialogBox
      open={!!apiKey}
      onClose={handleClose}
      maxWidth="sm"
      title={
        <Typography component="div" sx={{ fontSize: '1.5rem', fontWeight: 500 }}>
          {stepTitle[step]}
        </Typography>
      }
      content={stepContent[step]}
      actions={
        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          {step === 'challenge' && (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={verifying}
              sx={primaryBtnSx}
            >
              {verifying ? 'VALIDATING...' : 'VALIDATE'}
            </Button>
          )}
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

// Fixed option lists for the Keys filter panel. Environment and Status are
// stable enumerations, so they come from the known sets rather than the loaded
// rows — the options stay complete even when the data is empty or, later,
// server-paginated. Environment is scoped to the current deploy via
// CREATE_ENV_OPTIONS (getAllowedEnvironmentValues / NEXT_PUBLIC_APP_ENV), the
// same single source of truth used by the Create Key dropdown and the other
// env selectors in the app (operations console, onboarding senders).
const ENVIRONMENT_FILTER_OPTIONS: FilterOption[] = CREATE_ENV_OPTIONS.map((o) => ({
  value: o.displayName,
  label: o.displayName,
}))
const STATUS_FILTER_OPTIONS: FilterOption[] = [
  'Active',
  'Ready for Validation',
  'Grace Period',
  'Expired',
  'Revoked',
  'Cancelled',
].map((s) => ({ value: s, label: s }))

// The Use Types picker shows human-readable labels ("Public Health") as the
// visible option/chip text, while the credential is stored and validated by its
// canonical enum value ("PUBLIC_HEALTH"). This map converts label -> enum at
// the SearchableMultiSelect boundary so component state stays in enum values.
// (The option labels are computed per-org in CreateKeyDialog so the picker can
// narrow to the selected sender's useTypes.)
const LABEL_TO_USE_TYPE = Object.fromEntries(
  ALLOWED_USE_TYPES.map((ut) => [USE_TYPE_LABELS[ut], ut])
) as Record<string, AllowedUseType>

// Same display-label <-> id mapping pattern as useTypes above, for the
// multi-env Create-form picker (IZG Operations only — see isAdmin gating in
// CreateKeyDialog). CREATE_ENV_OPTIONS ids are numbers; component state keeps
// them as strings (matching envIds elsewhere in this dialog).
const CREATE_ENV_OPTION_LABELS: string[] = CREATE_ENV_OPTIONS.map((o) => o.displayName)
const LABEL_TO_ENV_ID = Object.fromEntries(
  CREATE_ENV_OPTIONS.map((o) => [o.displayName, String(o.id)])
) as Record<string, string>
const ENV_ID_TO_LABEL = Object.fromEntries(
  CREATE_ENV_OPTIONS.map((o) => [String(o.id), o.displayName])
) as Record<string, string>

const OTHER_DNS_VALUE = '__other__'

// Validates a custom DNS name entered when "Other" is selected: requires a
// real FQDN (at least one dot, e.g. dev.iz.gateway.org) — labels 1-63 chars,
// letters/digits/hyphens only, no leading/trailing hyphen, 253 chars max.
const DOMAIN_NAME_REGEX =
  /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))+$/

function isValidDomainName(value: string): boolean {
  return DOMAIN_NAME_REGEX.test(value.trim())
}

// Order-insensitive equality for two string lists (used to compare a
// credential's environment set and use-type set for the duplicate-scope check).
function sameStringSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((v, i) => v === sortedB[i])
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
  const { status: sessionStatus, data: session } = useSession()
  const isAdmin = !!session?.user?.isAdmin
  const jurisdictions = useOrganizations(sessionStatus)

  // The Create flow issues credentials to SENDERS, so the Organization dropdown
  // lists only sender rows — those carrying a non-empty `useTypes` (which also
  // covers dual-role rows that additionally have `allowedUseTypes`). Pure
  // jurisdiction/destination rows (`allowedUseTypes` only, no `useTypes`) are
  // excluded: a submitter credential can't be issued to a destination-only org.
  // NOTE: in an environment where no senders are seeded, this list is empty by
  // design (see IGDD-3140 seeding / Ticket 2).
  //
  // Also scoped to organizations this caller actually owns (mirrors the
  // server-side `ownsJurisdiction` check in POST /api/apikeys) — IZG Operations
  // is global, other roles are limited to `session.user.jurisdictions`. Without
  // this, a scoped role could pick an org it doesn't own, complete the entire
  // multi-step create flow (including a DNS challenge), and only discover the
  // 403 on final submit; the server-side check remains the authoritative gate.
  //
  // See `ownsJurisdictionForUi` for why this matches on `prefix`. A row with no
  // prefix is excluded rather than shown-and-then-403'd on submit.
  const senderOrganizations = useMemo(
    () =>
      Array.isArray(jurisdictions)
        ? jurisdictions.filter(
            (j) =>
              (j.useTypes?.length ?? 0) > 0 && ownsJurisdictionForUi(j, session)
          )
        : [],
    [jurisdictions, session]
  )

  const [jurisdictionId, setJurisdictionId] = useState<string>('')
  // Multi-select (several environments) is an admin-only capability; every
  // other role is limited to exactly one, but state is always an array so the
  // rest of the form doesn't need two code paths.
  const [envIds, setEnvIds] = useState<string[]>([])
  const [dnsSelection, setDnsSelection] = useState<string>('')
  const [customDomain, setCustomDomain] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [useTypes, setUseTypes] = useState<string[]>([])
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
    environments: number[]
  } | null>(null)

  const { data: existingDomains } = useSWR<{ domain: string }[]>(
    envIds.length && jurisdictionId
      ? `/api/apikeys/domains?envId=${envIds.join(',')}&jurisdictionId=${jurisdictionId}`
      : null,
    fetcher
  )

  // Existing credentials (ownership-scoped by the API) for the Q7
  // duplicate-scope guardrail. Reuses the SWR cache the main list already
  // populated; only keyed while the dialog is open.
  const { data: existingCredentials } = useSWR<ApiKeyCredential[]>(
    open ? '/api/apikeys' : null,
    fetcher
  )
  // jti of a duplicate the user has explicitly chosen to override, so the
  // warning arms once per distinct duplicate and clears if the scope changes.
  const [acknowledgedDuplicateJti, setAcknowledgedDuplicateJti] = useState<
    string | null
  >(null)

  const jurisdictionDescription =
    (Array.isArray(jurisdictions) &&
      jurisdictions.find((j) => String(j.jurisdictionId) === jurisdictionId)
        ?.description) ||
    ''

  // The credential's Use Types must be a subset of the selected sender's own
  // useTypes capability (IGDD-3140: `credential.useTypes ⊆ Sender.useTypes`).
  // So the picker narrows to the selected org's useTypes. Fallback to the full
  // enum when the org carries no useTypes — e.g. the real /api/jurisdictions
  // does not return it yet, and jurisdiction-only rows have none — so creation
  // still works outside mock mode rather than offering an empty picker.
  const useTypesForOrg = (
    orgId: string
  ): { options: readonly AllowedUseType[]; constrained: boolean } => {
    const org = Array.isArray(jurisdictions)
      ? jurisdictions.find((j) => String(j.jurisdictionId) === orgId)
      : undefined
    return org?.useTypes && org.useTypes.length
      ? { options: org.useTypes, constrained: true }
      : { options: ALLOWED_USE_TYPES, constrained: false }
  }
  const { options: allowedUseTypesForOrg, constrained: useTypesAreConstrained } =
    useTypesForOrg(jurisdictionId)
  const useTypeOptionLabels = allowedUseTypesForOrg.map(
    (ut) => USE_TYPE_LABELS[ut]
  )

  const environmentDisplayName = envIds
    .map((id) => CREATE_ENV_OPTIONS.find((opt) => String(opt.id) === id)?.displayName)
    .filter(Boolean)
    .join(', ')

  const isOther = dnsSelection === OTHER_DNS_VALUE

  // Q7 duplicate-scope guardrail (soft warning, not a block): if the key being
  // created would exactly duplicate an existing ACTIVE key's scope — same
  // jurisdiction, DNS name, environment set, and use-type set — steer the user
  // toward renewing that key instead of minting a redundant one. Renewal, not
  // a block, is the intended remedy, so this only warns and can be overridden.
  const pendingUpn = isOther ? customDomain.trim() : dnsSelection
  const duplicateKey =
    jurisdictionId && pendingUpn && envIds.length && useTypes.length
      ? (existingCredentials ?? []).find(
          (c) =>
            c.status === 'active' &&
            String(c.jurisdictionId) === jurisdictionId &&
            (c.domain ?? '') === pendingUpn &&
            sameStringSet((c.environments ?? []).map(String), envIds) &&
            sameStringSet((c.useTypes ?? []) as string[], useTypes)
        )
      : undefined
  // Shown only after the first submit attempt has "armed" it for this exact
  // duplicate (see handleNext), so the first click reveals the warning and the
  // second ("Create Anyway") proceeds. Clears automatically if the scope
  // changes to a different duplicate or none.
  const showDuplicateWarning =
    !!duplicateKey && acknowledgedDuplicateJti === duplicateKey.jti

  const handleClose = () => {
    setJurisdictionId('')
    setEnvIds([])
    setDnsSelection('')
    setCustomDomain('')
    setDescription('')
    setUseTypes([])
    setChallenge(null)
    setError(null)
    setStep('form')
    setAcknowledgedDuplicateJti(null)
    onClose()
  }

  const handleNext = async () => {
    const upn = isOther ? customDomain.trim() : dnsSelection
    if (!jurisdictionId || envIds.length === 0 || !upn || useTypes.length === 0) {
      setError('Please fill in all fields.')
      return
    }
    if (isOther && !isValidDomainName(upn)) {
      setError('Enter a valid domain name, e.g. dev.iz.gateway.org')
      return
    }
    // Soft duplicate-scope guardrail: first attempt on an exact-duplicate scope
    // only arms the warning (see showDuplicateWarning) and stops here; a second
    // click proceeds, creating the key anyway.
    if (duplicateKey && acknowledgedDuplicateJti !== duplicateKey.jti) {
      setAcknowledgedDuplicateJti(duplicateKey.jti)
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
          environments: envIds.map(Number),
          upn,
          description: description.trim() || undefined,
          dnsChoice: isOther ? 'other' : 'existing',
          useTypes,
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
          environments: body.environments,
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
      {showDuplicateWarning && duplicateKey && (
        <Alert severity="warning" sx={{ borderRadius: '8px' }}>
          An active key with this exact scope already exists
          {duplicateKey.description ? ` (“${duplicateKey.description}”)` : ''} —
          same organization, DNS name, environment(s), and use types. Renewing
          that key is usually preferable to creating a duplicate. Click “Create
          Anyway” to proceed regardless.
        </Alert>
      )}
      <LabeledField label="Organization" required>
        <Select
          value={jurisdictionId}
          onChange={(e) => {
            const newId = e.target.value
            setJurisdictionId(newId)
            setDnsSelection('')
            setCustomDomain('')
            // Drop any selected use types the newly-chosen sender doesn't
            // permit, so the credential's useTypes stay a subset of the org's.
            const allowed = useTypesForOrg(newId).options as readonly string[]
            setUseTypes((prev) => prev.filter((ut) => allowed.includes(ut)))
          }}
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
          {senderOrganizations.map((j) => (
            <MenuItem key={j.jurisdictionId} value={String(j.jurisdictionId)}>
              {j.description || j.name || j.jurisdictionId}
            </MenuItem>
          ))}
        </Select>
      </LabeledField>
      <LabeledField label="Environment" required>
        {isAdmin ? (
          // Multi-env is an admin-only capability (server-enforced too, not
          // just this UI gate) — matches the useTypes multi-select pattern.
          <SearchableMultiSelect
            label=""
            value={envIds.map((id) => ENV_ID_TO_LABEL[id] ?? id)}
            options={CREATE_ENV_OPTION_LABELS}
            onChange={(labels) => {
              setEnvIds(labels.map((l) => LABEL_TO_ENV_ID[l] ?? l))
              setDnsSelection('')
              setCustomDomain('')
            }}
            placeholder="Select one or more environments"
            chipColor="primary"
          />
        ) : (
          <Select
            value={envIds[0] ?? ''}
            onChange={(e) => {
              setEnvIds(e.target.value ? [e.target.value] : [])
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
        )}
      </LabeledField>
      <LabeledField label="Description (optional)">
        <TextField
          placeholder="e.g AAMBAE"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          sx={roundedFieldSx}
        />
      </LabeledField>
      <LabeledField label="Use Types" required>
        <SearchableMultiSelect
          label=""
          value={useTypes.map(
            (v) => USE_TYPE_LABELS[v as AllowedUseType] ?? v
          )}
          options={useTypeOptionLabels}
          onChange={(labels) =>
            setUseTypes(labels.map((l) => LABEL_TO_USE_TYPE[l] ?? l))
          }
          placeholder={
            jurisdictionId
              ? 'Select one or more use types'
              : 'Select an organization first'
          }
          disabled={!jurisdictionId}
          helperText={
            useTypesAreConstrained
              ? `Limited to what ${jurisdictionDescription || 'this organization'} is registered for`
              : undefined
          }
          chipColor="primary"
        />
      </LabeledField>
      <LabeledField label="DNS Name" required>
        <Select
          value={dnsSelection}
          onChange={(e) => setDnsSelection(e.target.value)}
          disabled={envIds.length === 0 || !jurisdictionId}
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
        Your validation for{' '}
        {jurisdictionDescription ||
          challenge.environments
            .map((id) => CREATE_ENV_OPTIONS.find((opt) => opt.id === id)?.displayName ?? id)
            .join(', ')}{' '}
        was confirmed. You can now remove this record.
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
          envIds.length === 0 ||
          !dnsSelection ||
          useTypes.length === 0 ||
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
        {submitting
          ? 'CHECKING...'
          : showDuplicateWarning
            ? 'CREATE ANYWAY'
            : 'NEXT'}
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

function RenewSuccessDialog({
  info,
  onViewKey,
  onClose,
}: {
  info: { sortKey: string; jurisdiction: string; mode: 'renew' | 'reissue' } | null
  onViewKey: () => void
  onClose: () => void
}) {
  if (!info) return null
  const isReissue = info.mode === 'reissue'
  return (
    <CustomDialogBox
      open={!!info}
      onClose={onClose}
      maxWidth="sm"
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon sx={{ fontSize: 28, color: palette.secondary }} />
          <span>{isReissue ? 'Re-issue Complete' : 'Renewal Complete'}</span>
        </Box>
      }
      content={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2">
            A new API key was {isReissue ? 'issued' : 'created'} for{' '}
            <strong>{info.jurisdiction}</strong>.
          </Typography>
          <Typography variant="body2" sx={{ color: palette.greyText }}>
            {isReissue
              ? 'It is valid for 1 year from issuance. The expired key is not reactivated. You can view the new token now, or later from the key’s View action.'
              : 'The previous key stays valid for 10 business days (grace period), then expires automatically. You can view the new token now, or later from the key’s View action.'}
          </Typography>
        </Box>
      }
      actions={
        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <Button
            variant="contained"
            onClick={onViewKey}
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
  const { status: sessionStatus, data: session } = useSession()

  // Role-based UI gating (IGDD-2708). useRoleAccess returns the page-scoped
  // access object for the current role, or undefined/{} when the role has no
  // entry or the session is still loading — so every flag defaults to false
  // (deny-by-default). NOTE: this gates the UI only; the API routes still need
  // server-side authorization (separate RBAC decision).
  const accessLevels = useRoleAccess() as
    | ApiKeyManagementPageAccessControl
    | undefined
  const canCreate = !!accessLevels?.canCreateApiKey
  const canRevoke = !!accessLevels?.canRevokeApiKey
  const canRenew = !!accessLevels?.canRenewApiKey
  const canCancel = !!accessLevels?.canCancelApiKey

  const {
    data: rawCredentials,
    error: fetchError,
    isLoading,
  } = useSWR<ApiKeyCredential[]>(
    sessionStatus === 'authenticated' ? '/api/apikeys' : null,
    fetcher,
    { shouldRetryOnError: true, errorRetryCount: 3, errorRetryInterval: 1000 }
  )

  // Organization filter options come from the jurisdictions list (not the
  // loaded rows) so they're complete and page-independent.
  const jurisdictions = useOrganizations(sessionStatus)

  const [validatingSortKey, setValidatingSortKey] = useState<string | null>(null)
  const [renewingSortKey, setRenewingSortKey] = useState<string | null>(null)
  const [reissuingSortKey, setReissuingSortKey] = useState<string | null>(null)

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

  // Organization options are the jurisdictions themselves: value = jurisdictionId
  // (matched against each row's jurisdictionId), label = the description. Sourced
  // from /api/jurisdictions so the list is complete and page-independent.
  //
  // Scoped to jurisdictions this caller owns (see `ownsJurisdictionForUi`).
  // /api/jurisdictions is deliberately unscoped server-side (it serves other
  // features too), and GET /api/apikeys already scopes the rows themselves — so
  // without this an unowned org would be offered here and just filter the grid to
  // nothing. Unlike the Create dropdown this list is NOT restricted to senders:
  // filtering is about what's in the grid, and a dual-role org can hold keys.
  const organizationOptions = useMemo<FilterOption[]>(
    () =>
      Array.isArray(jurisdictions)
        ? jurisdictions
            .filter((j) => ownsJurisdictionForUi(j, session))
            .map((j) => ({
              value: String(j.jurisdictionId),
              label: j.description || j.name || String(j.jurisdictionId),
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
        : [],
    [jurisdictions, session]
  )

  const [tabValue, setTabValue] = useState(0)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<ApiKeyFilters>(EMPTY_FILTERS)
  const [viewTarget, setViewTarget] = useState<ApiKey | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ApiKey | null>(null)
  const [renewTarget, setRenewTarget] = useState<ApiKey | null>(null)
  const [reissueTarget, setReissueTarget] = useState<ApiKey | null>(null)
  const [validateTarget, setValidateTarget] = useState<ApiKey | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{
    severity: 'success' | 'error' | 'warning' | 'info'
    title: string
    subtitle?: string
  } | null>(null)
  // After a successful renewal we show a success dialog (mirroring the Create
  // flow) that lets the user choose to view the new token now or later.
  const [renewSuccess, setRenewSuccess] = useState<{
    sortKey: string
    jurisdiction: string
    mode: 'renew' | 'reissue'
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
        const matchesSearch =
          k.keyId.toLowerCase().includes(q) ||
          k.description.toLowerCase().includes(q) ||
          k.jurisdiction.toLowerCase().includes(q) ||
          (k.domain ?? '').toLowerCase().includes(q) ||
          k.environment.toLowerCase().includes(q)
        // k.environment may be a comma-joined list for multi-env credentials,
        // so match on membership rather than exact equality.
        const matchesEnv =
          !filters.environment ||
          k.environment.split(', ').includes(filters.environment)
        // Cancelled records are retained for audit but kept off the default
        // view (noise); they surface only when explicitly filtered to Cancelled.
        const matchesStatus = filters.status
          ? k.status === filters.status
          : k.status !== 'Cancelled'
        const matchesOrg =
          !filters.organization || k.jurisdictionId === filters.organization
        return matchesSearch && matchesEnv && matchesStatus && matchesOrg
      }),
    [apiKeys, search, filters]
  )

  // An empty grid is a real answer, not a dead end — "this organization has no
  // keys yet" is exactly what someone checks before creating one (and why the
  // Organization filter deliberately lists every owned org, including those with
  // no keys). A bare "No rows" leaves the user to guess whether that's the
  // answer or something went wrong, so name the reason.
  const noRowsMessage = useMemo(() => {
    if (apiKeys.length === 0) {
      return 'No API keys yet.'
    }
    const orgLabel = filters.organization
      ? organizationOptions.find((o) => o.value === filters.organization)?.label
      : undefined
    const hasOtherFilters = !!(filters.environment || filters.status || search)
    if (orgLabel && !hasOtherFilters) {
      return `No API keys for ${orgLabel}.`
    }
    if (orgLabel) {
      return `No API keys for ${orgLabel} match the current filters.`
    }
    return 'No API keys match the current filters.'
  }, [apiKeys.length, filters, search, organizationOptions])

  const handleView = useCallback((key: ApiKey) => setViewTarget(key), [])
  const handleRevoke = useCallback((key: ApiKey) => setRevokeTarget(key), [])
  const handleCancel = useCallback((key: ApiKey) => setCancelTarget(key), [])
  const handleRenew = useCallback((key: ApiKey) => setRenewTarget(key), [])
  const handleReissue = useCallback((key: ApiKey) => setReissueTarget(key), [])
  const handleValidateClick = useCallback((key: ApiKey) => setValidateTarget(key), [])
  const handleRenewSubmittingChange = useCallback(
    (sortKey: string, submitting: boolean) =>
      setRenewingSortKey(submitting ? sortKey : null),
    []
  )
  const handleReissueSubmittingChange = useCallback(
    (sortKey: string, submitting: boolean) =>
      setReissuingSortKey(submitting ? sortKey : null),
    []
  )

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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to revoke key')
      }
      mutate('/api/apikeys')
      showSnackbar('success', `${jurisdiction} API Key revoked`, 'This key can no longer be used.')
    } catch (err) {
      showSnackbar('error', 'Failed to revoke key', err instanceof Error ? err.message : 'Please try again.')
    }
  }, [revokeTarget, showSnackbar])

  const confirmCancel = useCallback(async () => {
    if (!cancelTarget) return
    const { sortKey, jurisdiction } = cancelTarget
    setCancelTarget(null)
    try {
      const res = await fetch('/api/apikeys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortKey }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to cancel key')
      }
      mutate('/api/apikeys')
      showSnackbar('success', `${jurisdiction} API Key request cancelled`, 'The pending request has been cancelled.')
    } catch (err) {
      showSnackbar('error', 'Failed to cancel key', err instanceof Error ? err.message : 'Please try again.')
    }
  }, [cancelTarget, showSnackbar])

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

  // Called after a successful renewal: do NOT auto-reveal the token. Show a
  // success dialog that confirms the new key + grace window and lets the user
  // choose to view the token now (or later via the row's View icon).
  const handleRenewed = useCallback((sortKey: string, jurisdiction: string) => {
    setRenewSuccess({ sortKey, jurisdiction, mode: 'renew' })
  }, [])

  // Re-issue completion mirrors renewal's success dialog (View Key now/later),
  // but with re-issue wording (no grace period) via the shared dialog's mode.
  const handleReissued = useCallback((sortKey: string, jurisdiction: string) => {
    setRenewSuccess({ sortKey, jurisdiction, mode: 'reissue' })
  }, [])

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
        // An organization can have multiple credentials, so surface the DNS
        // name (the JWT `upn`) that distinguishes them.
        field: 'domain',
        headerName: 'DNS',
        flex: 1.5,
        minWidth: 150,
        renderCell: (params: GridRenderCellParams) => {
          const upn = (params.row as ApiKey).domain
          return (
            <Tooltip title={upn ?? ''} arrow>
              <Typography variant="body2" noWrap>
                {upn ?? '—'}
              </Typography>
            </Tooltip>
          )
        },
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
      {
        field: 'created',
        headerName: 'CREATED',
        flex: 1,
        minWidth: 100,
        // Compares the raw ISO timestamp, not the displayed locale date string
        // (which has no time component and sorts lexically, not chronologically).
        sortComparator: ((_v1, _v2, param1, param2) => {
          const t1 = (param1.api.getRow(param1.id) as ApiKey).createdOnRaw
          const t2 = (param2.api.getRow(param2.id) as ApiKey).createdOnRaw
          return (t1 ? new Date(t1).getTime() : 0) - (t2 ? new Date(t2).getTime() : 0)
        }) as GridComparatorFn,
      },
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
            onCancel={handleCancel}
            onRenew={handleRenew}
            onReissue={handleReissue}
            onValidate={handleValidateClick}
            onRevealToken={handleRevealToken}
            validating={validatingSortKey === (params.row as ApiKey).sortKey}
            renewing={renewingSortKey === (params.row as ApiKey).sortKey}
            reissuing={reissuingSortKey === (params.row as ApiKey).sortKey}
            canRevoke={canRevoke}
            canRenew={canRenew}
            canCancel={canCancel}
          />
        ),
      },
    ],
    [
      handleView,
      handleRevoke,
      handleCancel,
      handleRenew,
      handleReissue,
      handleValidateClick,
      handleRevealToken,
      validatingSortKey,
      renewingSortKey,
      reissuingSortKey,
      canRevoke,
      canRenew,
      canCancel,
    ]
  )

  const toolbarProps = useMemo(
    () => ({
      search,
      onSearchChange: handleSearchChange,
      tabValue,
      onTabChange: handleTabChange,
      filters,
      onFiltersChange: setFilters,
      environmentOptions: ENVIRONMENT_FILTER_OPTIONS,
      statusOptions: STATUS_FILTER_OPTIONS,
      organizationOptions,
    }),
    [search, handleSearchChange, tabValue, handleTabChange, filters, organizationOptions]
  )

  const footerProps = useMemo(
    () => ({ onCreateKey: handleCreateKey, canCreate }),
    [handleCreateKey, canCreate]
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
        initialState={{
          pagination: { paginationModel: { pageSize: 5 } },
          // Newest keys first by default, so a just-created row is immediately
          // visible on page 1 instead of wherever it lands in natural order.
          // Still just the default — clicking any column header re-sorts.
          sorting: { sortModel: [{ field: 'created', sort: 'desc' }] },
        }}
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
                {tabValue === 1 ? 'Audit log coming soon.' : noRowsMessage}
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
      <CancelDialog
        apiKey={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
      />
      <RenewDialog
        apiKey={renewTarget}
        onClose={() => setRenewTarget(null)}
        onRenewed={handleRenewed}
        onSubmittingChange={handleRenewSubmittingChange}
      />
      <ReissueDialog
        apiKey={reissueTarget}
        onClose={() => setReissueTarget(null)}
        onReissued={handleReissued}
        onSubmittingChange={handleReissueSubmittingChange}
      />
      <ValidateChallengeDialog
        apiKey={validateTarget}
        onClose={() => setValidateTarget(null)}
        onValidate={handleValidateRow}
      />
      <CreateKeyDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={revealToken}
      />
      <RenewSuccessDialog
        info={renewSuccess}
        onViewKey={() => {
          const sk = renewSuccess?.sortKey
          setRenewSuccess(null)
          if (sk) revealToken(sk)
        }}
        onClose={() => setRenewSuccess(null)}
      />
      <KeyCreatedDialog
        token={createdToken}
        onClose={() => setCreatedToken(null)}
      />
    </div>
  )
}
