import { hasAcceptedAgreement, setAcceptedAgreement, clearAcceptedAgreement } from './index'

const authorizationAgreementKey = 'authorization-agreement-accepted'

// Create mock of session storage
const mockSessionStorage = (() => {
  let store: { [key: string]: string } = {}

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    })
  }
})()

// Replace the global sessionStorage with our mock
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
})

describe('sessionStorageTests', () => {
  beforeEach(() => {
    // Clear the mock storage before each test
    mockSessionStorage.clear()
    jest.clearAllMocks()
  })

  describe('hasAcceptedAgreement', () => {

    it('should return false when no key is stored', () => {
      expect(hasAcceptedAgreement()).toBe(false)
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith(authorizationAgreementKey)
    })

    it('should return false when key is stored as "false"', () => {
      mockSessionStorage.setItem(authorizationAgreementKey, 'false')
      expect(hasAcceptedAgreement()).toBe(false)
    })

    it('should return false when agreement is stored as empty string', () => {
      mockSessionStorage.setItem(authorizationAgreementKey, '')
      expect(hasAcceptedAgreement()).toBe(false)
    })

    it('should return true when agreement is stored as "true"', () => {
      mockSessionStorage.setItem(authorizationAgreementKey, 'true')
      expect(hasAcceptedAgreement()).toBe(true)
    })

    it('should return false for any other string value', () => {
      mockSessionStorage.setItem(authorizationAgreementKey, 'yes')
      expect(hasAcceptedAgreement()).toBe(false)
    })

  })

  describe('setAcceptedAgreement', () => {
    it('should store "true" in sessionStorage', () => {
      setAcceptedAgreement()
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(authorizationAgreementKey, 'true')
      expect(hasAcceptedAgreement()).toBe(true)
    })

    it('should overwrite existing value', () => {
      mockSessionStorage.setItem(authorizationAgreementKey, 'false')
      expect(hasAcceptedAgreement()).toBe(false)

      setAcceptedAgreement()

      expect(hasAcceptedAgreement()).toBe(true)
    })
  })

  describe('clearAcceptedAgreement', () => {
    it('should remove the key from sessionStorage', () => {
      mockSessionStorage.setItem(authorizationAgreementKey, 'true')
      expect(hasAcceptedAgreement()).toBe(true)

      clearAcceptedAgreement()

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(authorizationAgreementKey)
      expect(hasAcceptedAgreement()).toBe(false)
    })

    it('should handle clearing non-existent key', () => {
      clearAcceptedAgreement()
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(authorizationAgreementKey)
    })
  })

  describe('integration tests', () => {
    it('should work together: set, check, clear, check', () => {
      // Initially should be false
      expect(hasAcceptedAgreement()).toBe(false)

      // Set agreement
      setAcceptedAgreement()
      expect(hasAcceptedAgreement()).toBe(true)

      // Clear agreement
      clearAcceptedAgreement()
      expect(hasAcceptedAgreement()).toBe(false)
    })

    it('should handle multiple set/clear cycles', () => {
      expect(hasAcceptedAgreement()).toBe(false)

      setAcceptedAgreement()
      expect(hasAcceptedAgreement()).toBe(true)

      clearAcceptedAgreement()
      expect(hasAcceptedAgreement()).toBe(false)

      setAcceptedAgreement()
      expect(hasAcceptedAgreement()).toBe(true)
    })
  })
})
