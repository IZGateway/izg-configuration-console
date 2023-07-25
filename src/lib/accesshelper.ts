export default function hasAccessToDestId(destId: string, session: any) {
  let isFound = false
  if (session.isAdmin) return true
  if (session.jurisdictions) {
    Object.values(session.jurisdictions).forEach((x: string) => {
      if (x.toLocaleLowerCase() === destId.toLocaleLowerCase()) {
        isFound = true
      }
    })
  } else {
    throw new Error(`User does not have assigned jurisdiction(s)`)
  }

  return isFound
}
