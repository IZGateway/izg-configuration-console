import {encryptWithKey, decryptWithKey, initCryptoSupport, isEncryptionEnabled} from './cryptoSupport'
import crypto from 'crypto'

describe('cryptoSupport', () => {
  const key = Buffer.from('ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ', 'utf8')
  const key2 = Buffer.from('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'utf8')

  beforeAll(async () => {
    if (typeof initCryptoSupport === 'function') {
      await initCryptoSupport() // Ensure crypto support is initialized
    }
  })
  
  it('encryption should be enabled', () => {
    expect(isEncryptionEnabled()).toBe(true)
  })

  const testPasswords = [
    ['simple password', 'PassWord123!@'],
    ['sentence', 'The quick brown fox jumps over the lazy dog'],
    ['empty string', ''],
    ['short string', 'Short'],
    ['very long and complex', 'A VeryLongPasswordThatExceedsNormalLengthAndIncludesVariousCharacters1234567890!@#$%^&*()_+-=[]{}|;:\'\",.<>/?`~'],
    ['azure sas token', 'sv=2022-11-02&st=2024-12-07T16%3A00%3A20Z&se=2028-12-08T16%3A00%3A00Z&sr=c&sp=racwdlt&sig=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX%3D'],
    ['multi-token', 'si=izgw_onb&sip=54.205.50.245&spr=https&sv=2022-11-02&sr=c&sig=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX%3D,si=izgw_dev&sip=96.230.147.79&spr=https&sv=2022-11-02&sr=c&sig=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX%3D'],
    ['ip-restricted token', 'si=izgw_dev&sip=24.241.16.161&spr=https&sv=2022-11-02&sr=c&sig=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX%3D']
  ]

  it('should produce unique ciphertexts for the same input', () => {
    testPasswords.forEach(([desc, password]) => {
      const encrypted = encryptWithKey(password, key)
      const encryptedAgain = encryptWithKey(password, key)
      if (password) expect(encrypted).not.toBe(encryptedAgain)
    })
  })

  it('should decrypt to the original password', () => {
    testPasswords.forEach(([desc, password]) => {
      const encrypted = encryptWithKey(password, key)
      const decrypted = decryptWithKey(encrypted, key)
      expect(decrypted).toBe(password)
    })
  })
  
  it('should not reencrypt an already encrypted password', () => {
    testPasswords.forEach(([desc, password]) => {
      const encrypted = encryptWithKey(password, key)
      const reEncrypted = encryptWithKey(encrypted, key)
      expect(reEncrypted).toBe(encrypted)
    })
  })

  it('should throw an authentication error with the wrong key', () => {
    testPasswords.forEach(([desc, password]) => {
      const encrypted = encryptWithKey(password, key)
      if (password) expect(() => decryptWithKey(encrypted, key2)).toThrow(/authenticate/i)
    })
  })
})
