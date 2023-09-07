function destTypeFormattedToSyncWithDB(dest) {
  switch (dest) {
    case 'Development':
      return 'DEV'
    case 'Production':
      return 'PRODUCTION'
    case 'Testing':
      return 'TEST'
    case 'Onboarding':
      return 'ONBOARD'
    case 'Staging':
      return 'STAGE'
    case 'UNKNOWN':
      return 'UNKNOWN'
    default:
      return 'NA'
  }
}

function destTypeFormattedToSyncWithApi(dest) {
  switch (dest) {
    case 'DEV':
      return 'Development'
    case 'PRODUCTION':
      return 'Production'
    case 'TEST':
      return 'Testing'
    case 'ONBOARD':
      return 'Onboarding'
    case 'STAGE':
      return 'Staging'
    case 'UNKNOWN':
      return 'UNKNOWN'
    default:
      return 'NA'
  }
}

const desttypehelper = {
  destTypeFormattedToSyncWithApi,
  destTypeFormattedToSyncWithDB,
}

export default desttypehelper
