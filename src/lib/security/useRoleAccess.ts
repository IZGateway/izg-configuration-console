import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { subjectOf } from './authzsubject'
import { mergePageAccess } from './policy'
import { derivePageKey } from './accessregistry'
import type { PageControls, PageKey } from './accesslevel'

/**
 * Page permission flags, merged across every role the user holds.
 *
 * Returns the same object shape as before, so components keep destructuring
 * flags unchanged — only the derivation moved from a single-role lookup to a
 * union. This is UI convenience, not a security boundary; the API routes remain
 * authoritative.
 *
 * ## Two call shapes
 *
 * `useRoleAccess('adminoperations')` — explicit page key. Returns
 * `Partial<PageControls[P]>`, properly typed, so the caller needs no cast. Use
 * this in new code.
 *
 * `useRoleAccess()` — key derived from `router.pathname`. Returns `any`,
 * preserving this hook's pre-existing contract: the key is only known at
 * runtime, so the compiler cannot know which page block comes back, and each of
 * the seven existing consumers declares its own control type for the result.
 *
 * The route-derived form is the part that is known-bad — a page whose route and
 * matrix key diverge silently gets `{}`, and `Home/index.tsx` already bypasses
 * it with a comment. The optional argument (IGDD-3472) is the way *out* of
 * that, added here rather than as a second hook so there are not two hooks
 * answering the same question with different ergonomics.
 *
 * Either way it returns `{}` while the session is loading or unauthenticated,
 * so `{flag && <Control/>}` fails closed. Never write `{!flag && …}`.
 */
// Overload signatures. The `no-redeclare` disables below are required because
// this repo runs the base ESLint rule rather than its TypeScript-aware
// replacement, and the base rule reads an overload set as a redeclaration.
// A conditional return type was tried instead and is worse: with no argument
// there is nothing to infer `P` from, so all seven existing consumers lose
// their types.
/* eslint-disable no-redeclare */
function useRoleAccess<P extends PageKey>(page: P): Partial<PageControls[P]>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useRoleAccess(): any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useRoleAccess<P extends PageKey>(page?: P): any {
  /* eslint-enable no-redeclare */
  const session = useSession()
  const router = useRouter()

  if (session.status === 'loading' || session.status === 'unauthenticated')
    return {}

  const key = page ?? (derivePageKey(router.pathname) as PageKey)
  const subject = subjectOf(session.data)

  // A route with no matching page block (e.g. `/`) yields `{}` — every flag then
  // reads as falsy, which is the same deny-by-default the previous
  // `accessLevel[role]?.[page]` lookup produced.
  return mergePageAccess(subject, key)
}

export default useRoleAccess
