import { StatusLevel } from '../types/destinationMetrics'

/** Returns true when a StatusLevel has a defined threshold result (not nodata). */
export const showStatus = (
  s: StatusLevel | undefined
): s is Exclude<StatusLevel, 'nodata'> => s != null && s !== 'nodata'
