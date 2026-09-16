import { isIP } from 'net'

/**
 * Builds a drop-in replacement for Node's DNS `lookup` that always returns one
 * fixed, already-validated IP address.
 *
 * Why this exists: the SSRF guard validates the destination by resolving it,
 * and the DNS test re-checks the address it hands to the rest of the suite.
 * But `https.request({ hostname })` and `tls.connect({ host })` perform their
 * own fresh resolution at connect time, through the OS resolver - a third
 * lookup, separate from the guard's and the DNS test's (both of which query
 * 8.8.8.8). An attacker controlling the destination's authoritative nameserver
 * can answer the first two queries with a public address and the connect-time
 * query with a private one (short-TTL rebinding, or branching on the querying
 * resolver), reaching an internal host despite the guard.
 *
 * Passing this function as the `lookup` option pins the connection to the
 * single address that was actually validated. The hostname is still supplied
 * to the request, so SNI and the Host header remain correct.
 *
 * Fails closed: if the pinned value is not a valid IP (for example the DNS
 * test never ran), the lookup errors instead of falling back to real
 * resolution.
 */
export const createPinnedLookup = (pinnedIp: string) => {
  const family = isIP(pinnedIp)

  return (hostname: string, options: unknown, callback?: unknown): void => {
    // Node calls lookup(hostname, options, cb) or lookup(hostname, cb)
    const done = (typeof options === 'function' ? options : callback) as (
      err: NodeJS.ErrnoException | null,
      address?: string | { address: string; family: number }[],
      family?: number
    ) => void

    if (!family) {
      const error: NodeJS.ErrnoException = new Error(
        `Refusing to resolve "${hostname}": no validated IP address is available to pin the connection to.`
      )
      error.code = 'ENOTFOUND'
      done(error)
      return
    }

    const wantsAll =
      typeof options === 'object' &&
      options !== null &&
      (options as { all?: boolean }).all === true

    if (wantsAll) {
      done(null, [{ address: pinnedIp, family }])
    } else {
      done(null, pinnedIp, family)
    }
  }
}
