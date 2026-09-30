import IZGHubStatusHistoryEndpoint from '../IZGHubStatusHistoryEndpoint'
import {
  assertSafeDestinationUrl,
  assertSafeRawDestinationUri,
  UnsafeDestinationUriError,
} from './destinationUriGuard'

/**
 * Applies the full destination URL specification to a `destUri` that is about
 * to be persisted.
 *
 * The connection test validated its own outbound target, but a `destUri` that
 * is written to a change request is far more consequential: on deploy it
 * becomes the address the IZ Gateway hub uses for real production submissions.
 * Validating only at test time enforced the rule where being wrong was
 * cheapest and skipped it where being wrong was permanent, so the same guard is
 * applied here, before a change request can be created.
 *
 * `destTypeId` is required because a relative `destUri` (for example
 * `/dev/IISService`) is legitimate: it is resolved against the configured hub
 * host for that destination type, exactly as the connection test does, and the
 * resulting absolute URL is what gets judged.
 */
const resolveDestinationUrl = (
  rawDestUri: string,
  destTypeId: number | string
): URL => {
  const raw = rawDestUri.trim()

  // Already absolute with an authority: judge it as-is.
  try {
    const parsed = new URL(raw)
    if (parsed.hostname) {
      return parsed
    }
  } catch {
    // relative path - resolved against the hub host below
  }

  const IZG_STATUS_ENDPOINT_URL = process.env.IZG_STATUS_ENDPOINT_URL || ''
  const configuredHubURLs = new IZGHubStatusHistoryEndpoint(
    IZG_STATUS_ENDPOINT_URL
  )
  // Throws when the environment has no hub URL for this destination type. That
  // is a misconfiguration, not a rejection: let it surface as a 500 rather than
  // silently accepting a URI we cannot resolve and therefore cannot validate.
  const base = new URL(configuredHubURLs.getIZGHubURL(destTypeId))

  try {
    const host = new URL(raw, base).host
    return new URL(`https://${host}${raw}`)
  } catch {
    throw new UnsafeDestinationUriError(
      `Destination URL "${raw}" is malformed and cannot be validated.`
    )
  }
}

export const assertSafeDestinationUri = async (
  rawDestUri: string,
  destTypeId: number | string
): Promise<void> => {
  // Raw string first: parsing normalises away evidence such as the single
  // slash in `https:/evil.com` - see assertSafeRawDestinationUri.
  assertSafeRawDestinationUri(rawDestUri)
  await assertSafeDestinationUrl(resolveDestinationUrl(rawDestUri, destTypeId))
}

export default assertSafeDestinationUri
