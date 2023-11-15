export default function hasAccessToDestId(destId: string, session: any) {
  let isFound = false
  if (session.user.isAdmin) return true
  if (session.user.jurisdictions) {
    Object.values(session.user.jurisdictions).forEach((x: string) => {
      if (x.toLocaleLowerCase() === destId.toLocaleLowerCase()) {
        isFound = true
      }
    })
  } else {
    throw new Error(`Non-admin users must be assigned at least 1 jurisdiction`)
  }

  return isFound
}
