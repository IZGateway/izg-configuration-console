import { isIP } from 'net'
import { promises as dnsPromises } from 'dns'

/**
 * SSRF guard for outbound connection-test targets.
 *
 * The connection-test endpoint accepts a destination (including its `destUri`)
 * from the request body, so the URI is attacker-controlled even for an
 * authorized user. Every outbound target must therefore be validated here
 * before any socket is opened.
 *
 * Rules, in order of application:
 *
 *  1. https only - never http, and never any other scheme
 *  2. no query string (no '?' anywhere in the raw URI)
 *  3. hostname must be an FQDN under an approved TLD
 *  4. no embedded credentials
 *  5. port must be on the allowlist (blocks internal port scanning)
 *  6. every resolved address must be publicly routable (blocks pivoting into
 *     the VPC and the 169.254.169.254 instance metadata service)
 *
 * Rules 1-3 come from the agreed destination URL specification. Rules 4-6 are
 * retained on top of it: a syntactically perfect URL such as
 * `https://evil.com/` satisfies rules 1-3 while still resolving to 10.0.0.5,
 * so rule 6 in particular is what actually closes the SSRF finding.
 */

const REQUIRED_SCHEME = 'https:'

/** The raw URI must literally start with this - see assertSafeRawDestinationUri. */
const REQUIRED_PREFIX = 'https://'

const DEFAULT_ALLOWED_PORTS = [80, 443]

/**
 * Approved destination hostname pattern: one or more DNS labels followed by an
 * approved TLD (US government/health domains and US territories).
 *
 * This allowlist also does the work of an internal-hostname denylist: bare IP
 * literals, `localhost`, `db.internal`, `nas.lan` and single-label hosts such
 * as `izgateway` all fail it, because none end in an approved TLD.
 */
const APPROVED_HOSTNAME_PATTERN =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:gov|net|us|com|health|org|nyc|as|gu|pr|mp|fm)$/

const CONNECTION_TEST_TIMEOUT = process.env.CONNECTION_TEST_TIMEOUT
  ? parseInt(process.env.CONNECTION_TEST_TIMEOUT, 10)
  : 5000

const resolver = new dnsPromises.Resolver({ timeout: CONNECTION_TEST_TIMEOUT })
resolver.setServers(['8.8.8.8', '8.8.4.4']) // public DNS only - never the VPC resolver

export class UnsafeDestinationUriError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeDestinationUriError'
  }
}

const getAllowedPorts = (): number[] => {
  const configured = process.env.CONNECTION_TEST_ALLOWED_PORTS
  if (!configured) {
    return DEFAULT_ALLOWED_PORTS
  }
  const ports = configured
    .split(',')
    .map((p) => parseInt(p.trim(), 10))
    .filter((p) => Number.isInteger(p) && p > 0 && p <= 65535)
  return ports.length ? ports : DEFAULT_ALLOWED_PORTS
}

const ipv4ToLong = (ip: string): number =>
  ip
    .split('.')
    .reduce((acc, octet) => (acc << 8) + (parseInt(octet, 10) & 0xff), 0) >>> 0

const cidrContains = (ip: string, cidr: string): boolean => {
  const [network, bitsAsString] = cidr.split('/')
  const bits = parseInt(bitsAsString, 10)
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  return (ipv4ToLong(ip) & mask) === (ipv4ToLong(network) & mask)
}

// RFC1918 + loopback + link-local + CGNAT + documentation/benchmark + multicast + reserved
const BLOCKED_IPV4_CIDRS = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.0.2.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '224.0.0.0/4',
  '240.0.0.0/4',
]

const isBlockedIpv4 = (ip: string): boolean =>
  BLOCKED_IPV4_CIDRS.some((cidr) => cidrContains(ip, cidr))

const isBlockedIpv6 = (ip: string): boolean => {
  const address = ip.toLowerCase().split('%')[0] // strip zone id

  // IPv4-mapped / IPv4-compatible (::ffff:10.0.0.1) - judge on the IPv4 part
  const embedded = address.match(/(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (embedded && isIP(embedded[1]) === 4) {
    return isBlockedIpv4(embedded[1])
  }

  if (address === '::' || address === '::1') {
    return true
  }

  const firstHextet = parseInt(address.split(':')[0] || '0', 16)
  if (Number.isNaN(firstHextet)) {
    return true
  }
  // fc00::/7 unique-local, fe80::/10 link-local, ff00::/8 multicast
  return (
    (firstHextet & 0xfe00) === 0xfc00 ||
    (firstHextet & 0xffc0) === 0xfe80 ||
    (firstHextet & 0xff00) === 0xff00
  )
}

export const isBlockedAddress = (ip: string): boolean => {
  const version = isIP(ip)
  if (version === 4) {
    return isBlockedIpv4(ip)
  }
  if (version === 6) {
    return isBlockedIpv6(ip)
  }
  return true // not an IP literal at all - fail closed
}

/**
 * Validates the destination URI as a raw string, before it is parsed or
 * resolved. Both checks here are deliberately textual, because parsing
 * destroys the evidence:
 *
 *  - `new URL('https:/xyz.com')` silently normalises the single slash away and
 *    reports protocol `https:` with hostname `xyz.com`, so a parsed check
 *    cannot tell it apart from a well-formed URL. The spec requires it to fail.
 *  - `new URL('https://host/x#?a=1')` reports an empty `search`, because the
 *    '?' sits inside the fragment. The spec forbids '?' anywhere.
 *
 * A URI that does not parse as absolute is a relative path (for example
 * `/dev/IISService`). Those are legitimate: the caller resolves them against
 * the configured hub host, and the resulting absolute URL is validated by
 * {@link assertSafeDestinationUrl}.
 */
export const assertSafeRawDestinationUri = (rawDestUri?: string): void => {
  if (!rawDestUri) {
    return
  }

  const raw = rawDestUri.trim()

  let isAbsolute = true
  try {
    new URL(raw)
  } catch {
    isAbsolute = false
  }

  if (!isAbsolute) {
    if (raw.includes('?')) {
      throw new UnsafeDestinationUriError(
        'Destination URLs must not contain a query string.'
      )
    }
    return // relative path - validated after the hub host is attached
  }

  if (!raw.toLowerCase().startsWith(REQUIRED_PREFIX)) {
    throw new UnsafeDestinationUriError(
      `Destination URLs must begin with "${REQUIRED_PREFIX}".`
    )
  }

  if (raw.includes('?')) {
    throw new UnsafeDestinationUriError(
      'Destination URLs must not contain a query string.'
    )
  }
}

/**
 * Throws {@link UnsafeDestinationUriError} if `url` is not a safe outbound
 * connection-test target. Resolves silently when the target is acceptable.
 *
 * A hostname that does not resolve is allowed through: nothing can be
 * connected to, and the DNS test reports the failure to the user as usual.
 */
export const assertSafeDestinationUrl = async (url: URL): Promise<void> => {
  if (url.protocol !== REQUIRED_SCHEME) {
    throw new UnsafeDestinationUriError(
      `Protocol "${url.protocol}" is not permitted. Destinations must use https.`
    )
  }

  if (url.search || url.href.includes('?')) {
    throw new UnsafeDestinationUriError(
      'Destination URLs must not contain a query string.'
    )
  }

  if (url.username || url.password) {
    throw new UnsafeDestinationUriError(
      'Destination URLs must not contain embedded credentials.'
    )
  }

  const hostname = url.hostname
  if (!hostname) {
    throw new UnsafeDestinationUriError('Destination URL has no hostname.')
  }

  // Bracketed IPv6 literals arrive from URL as "[::1]"
  const bareHost = hostname.replace(/^\[|\]$/g, '')

  if (!APPROVED_HOSTNAME_PATTERN.test(bareHost)) {
    throw new UnsafeDestinationUriError(
      `Destination host "${bareHost}" is not an approved destination hostname. It must be a fully qualified domain name ending in an approved top-level domain.`
    )
  }

  const allowedPorts = getAllowedPorts()
  const port = url.port ? Number(url.port) : 443
  if (!allowedPorts.includes(port)) {
    throw new UnsafeDestinationUriError(
      `Port ${port} is not permitted. Allowed ports: ${allowedPorts.join(', ')}.`
    )
  }

  // The hostname pattern rejects IP literals outright, so anything reaching
  // here is a name that has to be resolved before it can be trusted.
  let addresses: string[]
  try {
    const [v4, v6] = await Promise.all([
      resolver.resolve4(bareHost).catch(() => [] as string[]),
      resolver.resolve6(bareHost).catch(() => [] as string[]),
    ])
    addresses = [...v4, ...v6]
  } catch {
    addresses = []
  }

  if (!addresses.length) {
    return // unresolvable: nothing to connect to, let the DNS test report it
  }

  const blocked = addresses.filter((address) => isBlockedAddress(address))
  if (blocked.length) {
    throw new UnsafeDestinationUriError(
      `Destination ${bareHost} resolves to a reserved or private address (${blocked[0]}) and cannot be tested.`
    )
  }
}
