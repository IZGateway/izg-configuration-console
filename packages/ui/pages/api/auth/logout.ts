const customlLogout = (_req: any, res: any) => {
  res.redirect(`${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/logout?`)
}

export default customlLogout
