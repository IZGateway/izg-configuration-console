// Canonical use-type categories (IGDD-2707). Used as `AllowedUseType[]` for
// `ApiKeyCredential.useTypes` (the categories a credential is scoped to) and,
// in a later change, `Jurisdiction.allowedUseTypes`. The array of this union is
// the TypeScript type everywhere; storage is a plain DynamoDB List of strings.
export type AllowedUseType = 'PATIENT' | 'PROVIDER' | 'PUBLIC_HEALTH'

export const ALLOWED_USE_TYPES: readonly AllowedUseType[] = [
  'PATIENT',
  'PROVIDER',
  'PUBLIC_HEALTH',
]

// Human-readable labels for UI display.
export const USE_TYPE_LABELS: Record<AllowedUseType, string> = {
  PATIENT: 'Patient',
  PROVIDER: 'Provider',
  PUBLIC_HEALTH: 'Public Health',
}

// Runtime guard for validating API request bodies and narrowing DynamoDB reads.
export function isValidUseType(v: unknown): v is AllowedUseType {
  return (
    typeof v === 'string' &&
    (ALLOWED_USE_TYPES as readonly string[]).includes(v)
  )
}
