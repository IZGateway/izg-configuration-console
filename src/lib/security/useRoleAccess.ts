import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { subjectOf } from './authzsubject'
import { mergePageAccess } from './policy'
import type { PageKey } from './accesslevel'

/**
 * Page permission flags for the current route, merged across every role the user
 * holds.
 *
 * Returns the same object shape as before, so components keep destructuring
 * flags unchanged — only the derivation moved from a single-role lookup to a
 * union. This is UI convenience, not a security boundary; the API routes remain
 * authoritative.
 */
// Returns `any`, preserving this hook's pre-existing contract. It cannot be
// statically typed per call site: the page key is derived from `router.pathname`
// at runtime, so the compiler cannot know which page block comes back, and every
// consumer declares its own specific control type for the result.
//
// This is a UI-convenience hook, not a security boundary. The typed APIs are
// `can()` and `mergePageAccess()` in `policy.ts`; server routes use those.
// Passing the page key in explicitly would allow full typing here — worth doing,
// but it touches every consumer and is out of scope for the multi-role change.
const useRoleAccess = (): any => {
  const session = useSession()
  const router = useRouter()

  if (session.status === 'loading' || session.status === 'unauthenticated')
    return {}

  const page = router.pathname.replace(/\[.*?\]/g, '').replaceAll('/', '')
  const subject = subjectOf(session.data)

  // A route with no matching page block (e.g. `/`) yields `{}` — every flag then
  // reads as falsy, which is the same deny-by-default the previous
  // `accessLevel[role]?.[page]` lookup produced.
  return mergePageAccess(subject, page as PageKey)
}

export default useRoleAccess
