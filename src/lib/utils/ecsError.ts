/**
 * Safe ECS `error.*` logging (IGDD-3541).
 *
 * winston.format.errors() and @elastic/ecs-winston-format copy every
 * enumerable property of a logged Error into the event. For an AxiosError that
 * is its `config` and `request`, including the `https.Agent` that holds the Hub
 * client certificate, private key and passphrase. This module replaces that
 * with two winston formats, wired up in logger.ts:
 *
 * - `ecsErrors` (first in the pipeline): the event's own Error becomes ECS
 *   `error.*` fields, limited to an allowlist and each written as one type.
 * - `safeStringify` (last): ecsFormat's serializer with a replacer that writes
 *   any Error or Node network object, anywhere in any event, only in its safe
 *   form. This is the guarantee; `ecsErrors` is about the shape.
 *
 * Neither ever throws out of a log call, nor changes the caller's objects
 * (other than undoing what winston itself wrote onto a logged Error).
 *
 * What this cannot recognise is data a caller has already taken out of an
 * Error: never log `err.response`, `err.config` or `err.toJSON()` (which copies
 * the https.Agent into a plain object). Log the fields you need instead.
 */
import http from 'http'
import net from 'net'
import { types } from 'util'
import winston from 'winston'
import { configure } from 'safe-stable-stringify'
import {
  isPrimitive,
  toEcsUrl,
  toEcsUrlValue,
  withoutCredentials,
} from './ecsUrl'

// winston's info keys (triple-beam's), via the global symbol registry.
const LEVEL = Symbol.for('level')
const SPLAT = Symbol.for('splat')
const MESSAGE = Symbol.for('message')

type Fields = Record<string | symbol, unknown>

// ---------------------------------------------------------------------------
// Guarded access: a throwing getter, Proxy trap or non-configurable property
// never escapes a log call.
// ---------------------------------------------------------------------------

const read = <T>(get: () => T): T | undefined => {
  try {
    return get()
  } catch {
    return undefined
  }
}

// A shallow copy of an object's own enumerable properties (symbols included,
// as object spread copies them), leaving out any whose getter throws.
const copyOwn = (source: object): Fields => {
  const copy: Fields = {}
  for (const key of read(() => Reflect.ownKeys(source)) ?? []) {
    try {
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue
      copy[key] = (source as Fields)[key]
    } catch {
      // left out
    }
  }
  return copy
}

// Delete a property, ignoring one that cannot be deleted (non-configurable).
const remove = (target: Fields, key: string | symbol) => {
  try {
    delete target[key]
  } catch {
    // left as it is
  }
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

// Error.isError (Node 24) supersedes util.types.isNativeError (DEP0197).
const isNativeError =
  (Error as { isError?: (value: unknown) => boolean }).isError ??
  types.isNativeError

// Also true for Errors from another realm (vm contexts), unlike instanceof.
const isError = (value: unknown): value is Error => {
  try {
    return value instanceof Error || isNativeError(value)
  } catch {
    return false
  }
}

// Node's network objects hold sockets and agents (an https.Agent holds its
// client certificate and private key), and are never useful in a log.
const isNetworkObject = (value: object) => {
  try {
    return (
      value instanceof http.Agent ||
      value instanceof http.OutgoingMessage ||
      value instanceof http.IncomingMessage ||
      value instanceof net.Socket
    )
  } catch {
    return false
  }
}

// What a network object is written as: its class name.
const networkName = (value: object) =>
  `[${read(() => value.constructor.name) ?? 'object'}]`

const asString = (value: unknown) =>
  isPrimitive(value) ? String(value) : undefined

const asNumber = (value: unknown) => {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'bigint' ||
        (typeof value === 'string' && value.trim() !== '')
      ? Number(value)
      : NaN
  return Number.isFinite(n) ? n : undefined
}

// An object with only its scalar values; one that has only those already is
// returned as it is.
const asFlatObject = (value: unknown) => {
  if (!value || typeof value !== 'object') return undefined
  const entries = Object.entries(value)
  return entries.every(([, v]) => isPrimitive(v))
    ? value
    : Object.fromEntries(entries.filter(([, v]) => isPrimitive(v)))
}

// ---------------------------------------------------------------------------
// error.* fields
// ---------------------------------------------------------------------------

/**
 * Every `error.*` field this logger writes, and the one type each is written
 * as, so that none can become a mapping conflict. `toEcsError` writes them from
 * an Error; `toEcsErrorValue` makes a caller's own `error` object agree.
 */
const ERROR_FIELD_TYPES = {
  // ECS, derived from the Error.
  type: 'text',
  message: 'text',
  stack_trace: 'text',
  cause: 'text',
  // The allowlist, read from the Error's own properties.
  name: 'text',
  code: 'text',
  syscall: 'text',
  $fault: 'text',
  errno: 'number',
  status: 'number',
  statusCode: 'number',
  // AWS SDK errors: requestId, httpStatusCode, attempts.
  $metadata: 'flat',
  // Node system errors: the endpoint a connection failed to reach.
  address: 'text',
  hostname: 'text',
  port: 'number',
  // A failed axios request, from its config.
  method: 'text',
  url: 'url',
  // Further Errors (ecsErrors), each an error.* object.
  related: 'related',
  // ECS, only ever from a caller.
  id: 'text',
} as const

type FieldType = (typeof ERROR_FIELD_TYPES)[keyof typeof ERROR_FIELD_TYPES]

// The Error properties allowed into a log event: identifying, and free of
// payloads. Only scalars are taken from an Error (and $metadata's scalars).
const ERROR_OWN_FIELDS = [
  'name',
  'code',
  'syscall',
  '$fault',
  'errno',
  'status',
  'statusCode',
  '$metadata',
  'address',
  'hostname',
  'port',
] as const

const fromError: Record<FieldType, (value: unknown) => unknown> = {
  text: asString,
  number: asNumber,
  flat: asFlatObject,
  // Derived, never read from an Error's own properties: see
  // axiosRequestFields and ecsErrors.
  url: () => undefined,
  related: () => undefined,
}

// A request URL without credentials (withoutCredentials), query or fragment:
// which endpoint failed, and no more. Unlike a request's own url, an axios
// config's query is a value the code built, which could hold a secret. A
// relative url is joined to baseURL as axios joins them (isAbsoluteURL,
// combineURLs).
const endpoint = (url: unknown, baseURL: unknown) => {
  const path = asString(url)
  if (path === undefined) return undefined
  const base = asString(baseURL)
  const full =
    base && !/^([a-z][a-z\d+\-.]*:)?\/\//i.test(path)
      ? `${base.replace(/\/?\/$/, '')}/${path.replace(/^\/+/, '')}`
      : path
  return withoutCredentials(full).split(/[?#]/)[0]
}

// The method and endpoint of a failed axios request, from its config, which is
// otherwise never logged. `url` is the ECS url object, as everywhere else.
const axiosRequestFields = (err: Error): Fields => {
  const source = err as unknown as Fields
  if (read(() => source.isAxiosError) !== true) return {}
  const config = read(() => source.config) as Fields | undefined
  if (!config || typeof config !== 'object') return {}
  const fields: Fields = {}
  const method = read(() => asString(config.method)?.toUpperCase())
  if (method !== undefined) fields.method = method
  const url = read(() => endpoint(config.url, config.baseURL))
  if (url !== undefined) fields.url = toEcsUrl(url)
  return fields
}

const errorType = (err: Error) =>
  typeof err.constructor === 'function' && err.constructor.name
    ? err.constructor.name
    : String(err.name)

/**
 * Convert an Error into ECS `error.*` fields, as ecsFormat would (`type`,
 * `message`, `stack_trace`, `cause` as a string), but with only the
 * allowlisted properties (`ERROR_OWN_FIELDS`) instead of every enumerable one.
 *
 * Never throws: each property is read on its own, so one that cannot be read
 * (a throwing getter) is left out and the rest are kept.
 */
const toEcsError = (err: Error): Fields => {
  const fields: Fields = {}
  const source = err as unknown as Fields
  for (const field of ERROR_OWN_FIELDS) {
    const value = read(() =>
      Object.prototype.propertyIsEnumerable.call(err, field)
        ? fromError[ERROR_FIELD_TYPES[field]](source[field])
        : undefined
    )
    if (value !== undefined) fields[field] = value
  }
  fields.type = read(() => errorType(err)) ?? 'Error'
  fields.message =
    read(() => String(err.message ?? '')) ?? '[message could not be read]'
  const stack = read(() => asString(err.stack))
  if (stack !== undefined) fields.stack_trace = stack
  const cause = read(() => {
    const c = err.cause
    if (!c) return undefined
    return isError(c) ? asString(c.stack) ?? String(c.message) : String(c)
  })
  if (cause !== undefined) fields.cause = cause
  return Object.assign(fields, axiosRequestFields(err))
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

// The safe form of an Error or a network object, or undefined for any other
// value.
const reduce = (value: unknown) => {
  if (value === null || typeof value !== 'object') return undefined
  if (isError(value)) return toEcsError(value)
  if (isNetworkObject(value)) return networkName(value)
  return undefined
}

const stringify = configure({})

// A copy of the given keys of an object or array, as the same kind.
const copyKeys = (source: Record<string, unknown>, keys: string[]) => {
  const copy = (Array.isArray(source) ? [] : {}) as Record<string, unknown>
  for (const key of keys) copy[key] = read(() => source[key])
  return copy
}

/**
 * A replacer for one serialization: wherever an Error or a Node network object
 * is, at any depth and inside any object, only its safe form (`reduce`) is
 * written.
 *
 * Errors and network objects are reduced when their parent is visited, before
 * the serializer descends into them, so their own `toJSON` never runs:
 * AxiosError's would walk its request config, https.Agent included, into plain
 * data. A value that only a `toJSON` returns is reduced when it is visited. A
 * parent is copied at most once per serialization, so shared and circular
 * references still serialize as such; the caller's objects are never changed.
 */
const createReplacer = () => {
  const copies = new WeakMap<object, object>()
  return (_key: string, value: unknown): unknown => {
    const reduced = reduce(value)
    if (reduced !== undefined) return reduced
    if (value === null || typeof value !== 'object') return value
    const existing = copies.get(value)
    if (existing) return existing

    // The serializer writes an object's own enumerable keys (it has already
    // applied toJSON), which is what a copy holds.
    // An object whose keys or values cannot be read is left to the serializer,
    // which then throws: see safeStringify. Inline try/catch, as this runs for
    // every object in every line.
    const source = value as Record<string, unknown>
    let keys: string[]
    try {
      keys = Object.keys(source)
    } catch {
      return value
    }
    let copy: Record<string, unknown> | undefined
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index]
      let child: unknown
      try {
        child = source[key]
      } catch {
        continue
      }
      const safe = reduce(child)
      if (safe === undefined) {
        if (copy) copy[key] = child
        continue
      }
      copy ??= copyKeys(source, keys.slice(0, index))
      copy[key] = safe
    }
    if (!copy) return value
    copies.set(value, copy)
    return copy
  }
}

/**
 * Serialize a value as JSON, safely (see `createReplacer`). Throws only if the
 * value itself cannot be read (a throwing getter or toJSON).
 */
const stringifySafe = (value: unknown): string | undefined =>
  stringify(value, createReplacer())

// A value as text: a scalar as itself, anything else as its safe JSON.
const asText = (value: unknown) =>
  isPrimitive(value)
    ? String(value)
    : read(() => stringifySafe(value)) ?? '[unreadable]'

// ---------------------------------------------------------------------------
// A caller's own `error` value
// ---------------------------------------------------------------------------

const fromCaller: Record<FieldType, (value: unknown) => unknown> = {
  text: asText,
  number: asNumber,
  flat: asFlatObject,
  url: toEcsUrlValue,
  // An array of error.* objects; the same array if every item already is one.
  // One level deep: an item's own `related` is left out (ECS has no use for
  // it), so a `related` that refers back to itself cannot nest without end.
  related: (value) => {
    const items = Array.isArray(value) ? value : [value]
    const normalized = items.map((item) => toEcsErrorValue(item, false))
    const unchanged =
      Array.isArray(value) && normalized.every((item, i) => item === items[i])
    return unchanged ? value : normalized
  },
}

// What serialization writes for a value: the value, or what its toJSON returns.
const serializedForm = (value: unknown) =>
  value !== null && typeof value === 'object'
    ? read(() => {
        const toJSON = (value as { toJSON?: unknown }).toJSON
        return typeof toJSON === 'function' ? toJSON.call(value) : value
      })
    : value

/**
 * The ECS object shape for a caller's own `error` value:
 * - an Error becomes `toEcsError` fields, before its toJSON can run;
 * - a scalar becomes `{ message }`, an array `{ message: <its JSON> }`, and so
 *   does an object that serializes as a scalar (a Date, a URL, a network
 *   object);
 * - an object keeps its fields, each `error.*` field written as its type in
 *   `ERROR_FIELD_TYPES`; one that cannot be (`status: 'FAILED'`) is left out,
 *   as `toEcsError` does. The object is copied only if a field changes.
 *   Without `withRelated` (an item of error.related), `related` is left out.
 */
const errorValue = (value: unknown, withRelated: boolean): unknown => {
  // An Error or network object, checked before its toJSON runs, and then
  // whatever a toJSON returned.
  const own = reduce(value)
  const json = own === undefined ? serializedForm(value) : undefined
  const safe = own ?? reduce(json)
  if (typeof safe === 'string') return { message: safe }
  if (safe) return safe
  if (isPrimitive(json)) return { message: String(json) }
  if (Array.isArray(json)) return { message: asText(json) }
  if (json === null || typeof json !== 'object') return value

  const fields = json as Fields
  let copy: Fields | undefined
  for (const [key, type] of Object.entries(ERROR_FIELD_TYPES)) {
    const field = read(() => fields[key])
    if (field === undefined || field === null) continue
    const normalized =
      type === 'related' && !withRelated
        ? undefined
        : read(() => fromCaller[type](field))
    if (normalized === field) continue
    copy ??= copyOwn(fields)
    if (normalized === undefined) delete copy[key]
    else copy[key] = normalized
  }
  return copy ?? value
}

/**
 * The ECS object shape for a caller's own `error` value (see `errorValue`).
 * null and undefined pass through. Never throws: a value that cannot be read
 * at all (e.g. a revoked Proxy) is written as a placeholder message.
 */
export const toEcsErrorValue = (
  value: unknown,
  withRelated = true
): unknown => {
  if (value === null || value === undefined) return value
  try {
    return errorValue(value, withRelated)
  } catch {
    return { message: '[error could not be read]' }
  }
}

// ---------------------------------------------------------------------------
// winston formats
// ---------------------------------------------------------------------------

// Event keys winston sets itself, never copies of an Error's properties.
const WINSTON_KEYS = new Set<string | symbol>([
  'message',
  'level',
  LEVEL,
  SPLAT,
  MESSAGE,
])

/**
 * Write the event's own Errors as safe ECS `error.*` fields.
 *
 * Handles the shapes winston produces, as ecsFormat does:
 * - `logger.error(err)`: winston uses the Error itself as the event. A new
 *   event is returned, and the `level` winston wrote onto the Error removed.
 * - `logger.error(err, meta)` or `logger.error({ message: err })`: the Error is
 *   the `message`, which becomes its message string.
 * - `logger.error('msg', err)`: the Error is the first splat argument, and
 *   winston copied its properties into the event; those copies are removed.
 * - `{ err }` (ecsFormat's convention) and `{ error }` holding an Error.
 *
 * The first of these Errors becomes `error`, any others `error.related`, after
 * any non-Error `error` the caller set. Errors anywhere else are left to
 * `safeStringify`. So is `child.error(err)`: winston's child flattens the Error
 * into a plain object before any format runs (the app has no child loggers).
 *
 * `defaultMeta` returns the logger's defaultMeta, which winston merges into
 * the event in ways this has to undo or restore.
 */
export const ecsErrors = winston.format(
  (info, opts?: { defaultMeta?: () => unknown }) => {
    const field = (key: string | symbol) => read(() => (info as Fields)[key])
    const asInfo = isError(info) ? info : undefined
    const message = asInfo ? undefined : field('message')
    const asMessage = isError(message) ? message : undefined
    const splat = field(SPLAT)
    const asSplat =
      Array.isArray(splat) && isError(splat[0]) ? splat[0] : undefined
    // An Error used as the event has no fields of its own to read.
    const hasErrorField =
      !asInfo && (isError(field('err')) || isError(field('error')))
    if (!asInfo && !asMessage && !asSplat && !hasErrorField) return info

    const defaultMeta = copyOwn(Object(read(() => opts?.defaultMeta?.())))
    // A copy, so the caller's own object is never changed.
    const event: Fields = asInfo
      ? { level: field('level'), [LEVEL]: field(LEVEL) }
      : copyOwn(info)

    if (asInfo) {
      // winston wrote level onto the caller's Error: removed, as ecsFormat
      // does. It also wrote the logger's defaultMeta, which the event gets; that
      // is left on the Error, as it cannot be told from the Error's own
      // properties.
      remove(asInfo as unknown as Fields, 'level')
      remove(asInfo as unknown as Fields, LEVEL)
      Object.assign(event, defaultMeta)
    }

    const splatFields = asSplat && toEcsError(asSplat)
    if (asSplat && Array.isArray(splat)) {
      // winston copied the Error's properties into the event: remove the
      // copies, restoring any defaultMeta value they replaced. The event holds
      // only winston's own keys, defaultMeta and these copies, so any key the
      // Error has is a copy.
      const keys = read(() => Reflect.ownKeys(asSplat)) ?? []
      for (const key of [...keys, 'stack', 'cause']) {
        if (WINSTON_KEYS.has(key) || !(key in event)) continue
        if (key in defaultMeta) event[key] = defaultMeta[key]
        else delete event[key]
      }
      // ecsFields reads the first splat argument too.
      event[SPLAT] = [splatFields, ...splat.slice(1)]
    }

    // Read after the copies are removed: an `err` or `error` the logged Error
    // carries is not one the caller passed.
    const err = event.err
    const error = event.error
    if (isError(err)) delete event.err

    const [primary, ...others] = [
      asInfo && toEcsError(asInfo),
      asMessage && toEcsError(asMessage),
      splatFields,
      isError(err) && toEcsError(err),
      isError(error) && toEcsError(error),
    ].filter((f): f is Fields => !!f)
    // A non-Error `error` the caller set is kept, first in error.related.
    const explicit =
      error === undefined || error === null || isError(error)
        ? []
        : [toEcsErrorValue(error, false)]
    const related = [...explicit, ...others]
    event.error = related.length > 0 ? { ...primary, related } : primary
    if (asInfo || asMessage) event.message = primary.message || primary.type
    return event as winston.Logform.TransformableInfo
  }
)

// If an event cannot be serialized (a throwing getter or toJSON), write every
// top-level field that can be, rather than throw out of the log call. Keys are
// sorted, as stringify sorts them.
const stringifyFieldByField = (fields: Record<string, unknown>) => {
  const parts = Object.keys(fields)
    .sort()
    .flatMap((key) => {
      const json = read(() => stringifySafe(fields[key]))
      return json === undefined ? [] : [`${JSON.stringify(key)}:${json}`]
    })
  return `{${parts.join(',')}}`
}

/**
 * ecsFormat's serialization step (ecsStringify: the event without `level`),
 * with `stringifySafe`.
 */
export const safeStringify = winston.format((info) => {
  const fields = copyOwn(info) as Record<string, unknown>
  delete fields.level
  let line: string | undefined
  try {
    line = stringifySafe(fields)
  } catch {
    line = stringifyFieldByField(fields)
  }
  ;(info as Fields)[MESSAGE] = line
  return info
})
