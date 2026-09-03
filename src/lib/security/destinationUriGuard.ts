import { isIP } from 'net'
import { promises as dnsPromises } from 'dns'

/**
 * SSRF guard for outbound connection-test targets.
 *
 * The connection-test endpoint accepts a destination (including its `destUri`)
 * from the request body, so the URI is attacker-controlled even for an
 * authorized user. Every outbound target must therefore be validated here
 * before any socket is opened:
 *
 *  - only http/https (blocks file://, gopher://, tftp://, ftp:// ...)
 *  - no embedded credentials
 *  - port must be on the allowlist (blocks internal port scanning)
 *  - the hostname must not resolve to a private / loopback / link-local /
 *    otherwise-reserved address (blocks pivoting into the VPC and the
 *    169.254.169.254 instance metadata service)
 */

const ALLOWED_PROTOCOLS = ['https:', 'http:']

const DEFAULT_ALLOWED_PORTS = [80, 443]

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

/**
 * Hostnames that must never be tested, regardless of what DNS says.
 *
 * The guard resolves against public DNS, so a name that only a local hosts
 * file or an internal resolver knows about comes back with zero addresses.
 * Those names have to be rejected by name instead.
 *
 * Covers RFC 6761 / RFC 8375 special-use names plus the common internal
 * suffixes used by mDNS and cloud private zones.
 */
const BLOCKED_HOST_SUFFIXES = [
  'localhost',
  '.localhost',
  '.local',
  '.internal',
  '.intranet',
  '.home.arpa',
  '.test',
  '.invalid',
  '.localdomain',
]

export const isBlockedHostname = (hostname: string): boolean => {
  const host = hostname.toLowerCase().replace(/\.$/, '') // strip root dot
  return BLOCKED_HOST_SUFFIXES.some((suffix) =>
    suffix.startsWith('.') ? host.endsWith(suffix) : host === suffix
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
 * Throws {@link UnsafeDestinationUriError} if `url` is not a safe outbound
 * connection-test target. Resolves silently when the target is acceptable.
 *
 * A hostname that does not resolve is allowed through: nothing can be
 * connected to, and the DNS test reports the failure to the user as usual.
 */
export const assertSafeDestinationUrl = async (url: URL): Promise<void> => {
  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    throw new UnsafeDestinationUriError(
      `Protocol "${url.protocol}" is not permitted. Only http and https destinations can be tested.`
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

  const allowedPorts = getAllowedPorts()
  const port = url.port
    ? Number(url.port)
    : url.protocol === 'http:'
      ? 80
      : 443
  if (!allowedPorts.includes(port)) {
    throw new UnsafeDestinationUriError(
      `Port ${port} is not permitted. Allowed ports: ${allowedPorts.join(', ')}.`
    )
  }

  // Bracketed IPv6 literals arrive from URL as "[::1]"
  const bareHost = hostname.replace(/^\[|\]$/g, '')

  if (isBlockedHostname(bareHost)) {
    throw new UnsafeDestinationUriError(
      `Destination host "${bareHost}" is a local or internal-only name and cannot be tested.`
    )
  }

  if (isIP(bareHost)) {
    if (isBlockedAddress(bareHost)) {
      throw new UnsafeDestinationUriError(
        `Destination address ${bareHost} is in a reserved or private range and cannot be tested.`
      )
    }
    return
  }

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
