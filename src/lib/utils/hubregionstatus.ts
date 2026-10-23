/**
 * The hub's per-region status block, and the one rule that turns it into a
 * message level (IGDD-3599).
 *
 * The hub answers a fleet-wide reset with two maps. `hosts` is keyed by
 * private AWS DNS name and must never reach the browser. `regions` carries one
 * status per AWS region, with no host name and no instance count, so it can be
 * forwarded to the browser unchanged. Only `regions` is read here — see the
 * change's design D1/D3.
 *
 * Both the Admin Operations card and the Manage Connections dialog import this
 * module, so the two screens cannot disagree about what "success" means.
 */

/** Region name (e.g. `us-east-1`) -> status word. */
export type HubRegionStatuses = Record<string, string>

export type HubOperationLevel = 'success' | 'warning' | 'error'

/**
 * The status vocabulary is a CLOSED SET: `complete`, `partial`, `failed`.
 *
 * Anything else is treated as a failure by `hubOperationLevel` below, so the
 * hub cannot add a fourth word on its own — every deployed console would
 * render it as a warning whatever it meant. Adding one is a coordinated
 * contract change across izgw-hub and izg-configuration-console. The hub
 * records the same constraint in its design D5.
 */
export const HUB_REGION_COMPLETE = 'complete'
export const HUB_REGION_FAILED = 'failed'

const statusesOf = (regions?: HubRegionStatuses): string[] | undefined => {
  if (!regions || typeof regions !== 'object' || Array.isArray(regions)) {
    return undefined
  }
  const values = Object.values(regions).map((value) => String(value))
  return values.length > 0 ? values : undefined
}

/**
 * Decides the message level from the per-region status alone.
 *
 * The hub answers 200 even on a partial failure, so the HTTP status cannot be
 * used for this. Returns `undefined` when the hub sent no block — that is an
 * older hub, and the caller then falls back to its pre-IGDD-3599 behaviour.
 *
 * Fails closed: a status word this release does not recognise is not
 * `complete`, so it yields `warning` rather than `success`. Reporting a
 * failure as a completed reset is the one outcome worth engineering against.
 */
export const hubOperationLevel = (
  regions?: HubRegionStatuses
): HubOperationLevel | undefined => {
  const statuses = statusesOf(regions)
  if (!statuses) {
    return undefined
  }
  if (statuses.every((status) => status === HUB_REGION_COMPLETE)) {
    return 'success'
  }
  if (statuses.every((status) => status === HUB_REGION_FAILED)) {
    return 'error'
  }
  return 'warning'
}

/**
 * The regions that did not complete, so a message can name them. Returns an
 * empty array when the hub sent no block.
 */
export const regionsNotComplete = (regions?: HubRegionStatuses): string[] => {
  if (!statusesOf(regions)) {
    return []
  }
  return Object.keys(regions).filter(
    (region) => String(regions[region]) !== HUB_REGION_COMPLETE
  )
}
