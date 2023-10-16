import existingPassword from './queries/fetch/existingPassword'
import submittedPassword from './queries/fetch/submittedPassword'

export default async function isPasswordUpdated(
  destId: string,
  destTypeId: any
) {
  const submittedPasswordResult = await submittedPassword(destId, destTypeId)
  const existingPasswordResult = await existingPassword(destId, destTypeId)

  const passwordsDifferent =
    submittedPasswordResult.password !== existingPasswordResult.password

  return passwordsDifferent
}
