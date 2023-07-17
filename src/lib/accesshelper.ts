export default function hasAccessToDestId(destId: string, session: any) {
  let isFound = false
  if (session.isAdmin) return true
  Object.values(session.jurisdictions).forEach((x: string) => {
    if (x.toLocaleLowerCase() === destId.toLocaleLowerCase()) {
      isFound = true
    }
  })
  return isFound
}
