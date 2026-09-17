/**
 * @jest-environment node
 */
import { menuItems } from './menuItems'

const item = (label: string) => {
  const found = menuItems.find((m) => m.label === label)
  if (!found) throw new Error(`No menu item labeled "${label}"`)
  return found
}

// API Key Management is also gated on the IGDD-3444 kill switch
// (`session.apiKeyManagementEnabled`), independent of role — see menuItems.tsx.
const enabledSession = { apiKeyManagementEnabled: true } as any

describe('nav visibility: Sender Operations sees only API Key Management', () => {
  const senderRoles = ['Sender Operations']

  it('hides Manage Connections', () => {
    expect(item('Manage Connections').isVisible?.(senderRoles)).toBe(false)
  })

  it('hides Onboarding Senders', () => {
    expect(item('Onboarding Senders').isVisible?.(senderRoles)).toBe(false)
  })

  it('shows API Key Management when the feature flag is on', () => {
    expect(item('API Key Management').isVisible?.(senderRoles, enabledSession)).toBe(
      true
    )
  })

  it('hides API Key Management when the feature flag is off, even with the role', () => {
    expect(item('API Key Management').isVisible?.(senderRoles)).toBe(false)
    expect(
      item('API Key Management').isVisible?.(senderRoles, {
        apiKeyManagementEnabled: false,
      } as any)
    ).toBe(false)
  })
})

describe('nav visibility: existing roles are unchanged', () => {
  it.each([
    'IZG Operations',
    'IZG Support',
    'Jurisdiction Operations',
    'Jurisdiction Support',
  ])('%s still sees Manage Connections and Onboarding Senders', (role) => {
    expect(item('Manage Connections').isVisible?.([role])).toBe(true)
    expect(item('Onboarding Senders').isVisible?.([role])).toBe(true)
  })
})

describe('nav visibility: no held roles', () => {
  it('hides every gated item even with the feature flag on', () => {
    expect(item('Manage Connections').isVisible?.([])).toBe(false)
    expect(item('Onboarding Senders').isVisible?.([])).toBe(false)
    expect(item('API Key Management').isVisible?.([], enabledSession)).toBe(false)
  })

  it('hides every gated item when roles is undefined', () => {
    expect(item('Manage Connections').isVisible?.(undefined)).toBe(false)
    expect(item('Onboarding Senders').isVisible?.(undefined)).toBe(false)
    expect(item('API Key Management').isVisible?.(undefined, enabledSession)).toBe(
      false
    )
  })
})
