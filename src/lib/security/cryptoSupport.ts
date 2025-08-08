import crypto from 'crypto'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

const IV_LENGTH = 16 // AES block size
const TAG_LENGTH = 16 // GCM tag size
const KEY_LENGTH = 32 // AES-256 key size
const KEY_NAME = process.env.DDB_ENCRYPTION_KEYNAME || 'devdb-test'
const SECRETS_CLIENT = new SecretsManagerClient()
const CIPHER_ALGORITHM = 'aes-256-gcm'
const CIPHER_OPTIONS = { "authTagLength": TAG_LENGTH } 
/**
 * Reads a secret key from AWS Secrets Manager.
 * @param secretName - The name of the secret in AWS Secrets Manager.
 * @returns The secret value as a Promise<string>.
 */
const getKeyFromSecretsManager = async (secretName: string | null): Promise<Buffer | null> => {
  if (!secretName) {
    return null
  }
  const command = new GetSecretValueCommand({ SecretId: secretName })
  const response = await SECRETS_CLIENT.send(command)
  if (response.SecretString) {
    const buf = Buffer.from(response.SecretString, 'hex')
    if (buf.length !== KEY_LENGTH) {
      throw new Error(`Secret key length is ${buf.length}, expected ${KEY_LENGTH}`)
    }
  }
  throw new Error('Secret not found or is binary')
}

let cachedKey: Buffer | null = null;

// Buffer.from('ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ', 'utf8') 
// Placeholder key for testing; replace with secure key management in production
// crypto.randomBytes(KEY_LENGTH) 
// await getKeyFromSecretsManager(KEY_NAME)

/**
 * Encrypts text using AES-256-CBC.
 * @param text - The plain text to encrypt.
 * @param iv - A 16-byte initialization vector.
 * @returns The encrypted text in base64 encoding.
 */
export const encrypt = (text: string): string => {
  if (KEY_NAME == null) { return text } // No encryption key configured, return as is
  // no encryption key available, or no text, or already encrypted
  if (cachedKey == null || text === null || text.length == 0 || text.startsWith('==')) { 
    return text 
  } 
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, cachedKey, iv, CIPHER_OPTIONS)
  const textBuffer = Buffer.from(text, 'utf8')
  let encrypted = Buffer.concat([cipher.update(textBuffer), cipher.final()])
  encrypted = Buffer.concat([iv, encrypted, cipher.getAuthTag()])   // Append the AuthTag b/c that is what BC-FIPS expects
  return '==' + encrypted.toString('base64')
}

/**
 * Decrypts text using AES-256-CBC.
 * @param encryptedText - The encrypted text in base64 encoding.
 * @param iv - A 16-byte initialization vector.
 * @returns The decrypted plain text.
 */
export const decrypt = (encryptedText: string): string => {
  if (KEY_NAME == null) { return encryptedText } // No encryption key configured, return as is
  if (cachedKey == null || encryptedText == null || !encryptedText.startsWith('==')) {
    return encryptedText // Not encrypted
  }
  const data = Buffer.from(encryptedText.slice(2), 'base64')
  const iv = data.subarray(0, IV_LENGTH)
  const encrypted = data.subarray(IV_LENGTH, data.length - TAG_LENGTH)
  const authTag = data.subarray(data.length - TAG_LENGTH)
  
  const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, cachedKey, iv, CIPHER_OPTIONS)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString('utf8')
}

function verifyEncryption() {
  const testPasswords: string[] = [
    'Password123!',
    'letmein2025',
    'S3cureP@ssw0rd',
    'hunter2',
    'correcthorsebatterystaple',
    'Tr0ub4dor&3',
    'qwerty!@#',
    'admin1234',
    'passw0rd!',
    'Zxcvbnm,./123',
    'The quick brown fox jumps over the lazy dog',
    // Including some edge cases
    '',
    'Short',
    'A VeryLongPasswordThatExceedsNormalLengthAndIncludesVariousCharacters1234567890!@#$%^&*()_+-=[]{}|;:\'",.<>/?`~',
    'sv=2022-11-02&st=2024-12-07T16%3A00%3A20Z&se=2028-12-08T16%3A00%3A00Z&sr=c&sp=racwdlt&sig=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX%3D',
    'si=izgw_onb&sip=54.205.50.245&spr=https&sv=2022-11-02&sr=c&sig=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX%3D,si=izgw_dev&sip=96.230.147.79&spr=https&sv=2022-11-02&sr=c&sig=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX%3D',
    'si=izgw_dev&sip=24.241.16.161&spr=https&sv=2022-11-02&sr=c&sig=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX%3D'
  ]
  testPasswords.forEach(password => {
    const encrypted = encrypt(password)
    const encryptedAgain = encrypt(password) // Should NOT be the same as encrypted
    const decrypted = decrypt(encrypted)
    const decryptedAgain = decrypt(encryptedAgain) // Should be the same as original password
    if (encrypted === encryptedAgain) {
        throw new Error('Encryption is not producing unique ciphertexts for the same input')
    }
    if (decrypted !== password || decryptedAgain !== password) {
        throw new Error('Decryption did not return the original password')
    }
  })
}

export async function setup() {
  cachedKey = await getKeyFromSecretsManager(KEY_NAME)
  if (cachedKey !== null) {
    verifyEncryption()
  }
}
