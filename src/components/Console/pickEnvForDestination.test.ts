import { pickEnvForDestination } from './index'

describe('pickEnvForDestination', () => {
  it('keeps the chosen environment when the new destination offers it', () => {
    // Regression: DEV outranks TEST in the default priority, so choosing Test
    // and then a destination used to switch the chip to Development.
    expect(pickEnvForDestination(['DEV', 'TEST'], 'TEST')).toBe('TEST')
  })

  it('falls back to the priority default when the destination lacks it', () => {
    expect(pickEnvForDestination(['DEV', 'PRODUCTION'], 'TEST')).toBe('PRODUCTION')
  })

  it('uses the priority default when nothing is chosen yet', () => {
    expect(pickEnvForDestination(['TEST', 'DEV'], '')).toBe('DEV')
  })

  it('returns empty when the destination has no environments', () => {
    expect(pickEnvForDestination([], 'TEST')).toBe('')
  })
})
