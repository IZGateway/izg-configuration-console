import crypto from 'crypto'
import { SecretsManagerClient, GetSecretValueCommand, CreateSecretCommand, PutSecretValueCommand } from '@aws-sdk/client-secrets-manager'

const IV_LENGTH = 16 // AES block size
const TAG_LENGTH = 16 // GCM tag size
export const KEY_LENGTH = 32 // AES-256 key size
const KEY_NAME = process.env.DDB_ENCRYPTION_KEYNAME || null
const SECRETS_CLIENT = new SecretsManagerClient()
const CIPHER_ALGORITHM = 'aes-256-gcm'
const CIPHER_OPTIONS = { "authTagLength": TAG_LENGTH } 
let cachedKeys: (Buffer | null)[] = [null, null]

export async function initCryptoSupport() {
  if (KEY_NAME) {
    cachedKeys = await getKeyFromSecretsManager(KEY_NAME)
  }
}

export const isEncryptionEnabled = () => !!getCurrentKey();

// For backward compatibility, use the first key as the current key
const getCurrentKey = () => cachedKeys[0]
const getPreviousKey = () => cachedKeys[1]

/**
 * Reads a secret key from AWS Secrets Manager.
 * @param secretName - The name of the secret in AWS Secrets Manager.
 * @returns The secret value as a Promise<string>.
 */
async function getKeyFromSecretsManager(secretName: string | null): Promise<(Buffer|null)[]> {
  if (!secretName) {
    return [null, null];
  }
  // Get current version
  const currentCommand = new GetSecretValueCommand({ SecretId: secretName });
  const currentResponse = await SECRETS_CLIENT.send(currentCommand);
  let currentKey: Buffer | null = null;
  if (currentResponse.SecretString) {
    currentKey = Buffer.from(currentResponse.SecretString, 'hex');
    if (currentKey.length !== KEY_LENGTH) {
      throw new Error(`Current secret key length is ${currentKey.length}, expected ${KEY_LENGTH}`);
    }
  }

  // Get previous version
  let previousKey: Buffer | null = null;
  try {
    const previousCommand = new GetSecretValueCommand({ SecretId: secretName, VersionStage: 'AWSPREVIOUS' });
    const previousResponse = await SECRETS_CLIENT.send(previousCommand);
    if (previousResponse.SecretString) {
      previousKey = Buffer.from(previousResponse.SecretString, 'hex');
      if (previousKey.length !== KEY_LENGTH) {
        throw new Error(`Previous secret key length is ${previousKey.length}, expected ${KEY_LENGTH}`);
      }
    }
  } catch (e) {
    // No previous version exists, leave as null
  }

  if (!currentKey) throw new Error('Secret not found or is binary');
  return [currentKey, previousKey];
}

/**
 * Stores a new encryption key in AWS Secrets Manager under KEY_NAME.
 * If the secret does not exist, it will be created. If it exists, it will be updated.
 * @param keyBuffer - The key to store (must be 32 bytes for AES-256)
 */
export async function storeKeyInSecretsManager(keyBuffer: Buffer): Promise<void> {
  if (!KEY_NAME) throw new Error('KEY_NAME is not defined');
  if (!keyBuffer || keyBuffer.length !== KEY_LENGTH) throw new Error('Key must be 32 bytes');
  const hexKey = keyBuffer.toString('hex');
  try {
    // Try to create the secret
    const createCommand = new CreateSecretCommand({
      Name: KEY_NAME,
      SecretString: hexKey,
    });
    await SECRETS_CLIENT.send(createCommand);
  } catch (err) {
    // If the secret already exists, update it
    if (err.name === 'ResourceExistsException') {
      const putCommand = new PutSecretValueCommand({
        SecretId: KEY_NAME,
        SecretString: hexKey,
      });
      await SECRETS_CLIENT.send(putCommand);
    } else {
      throw err;
    }
  }
}

/**
 * Encrypts text using AES-256-CBC.
 * @param text - The plain text to encrypt.
 * @param iv - A 16-byte initialization vector.
 * @returns The encrypted text in base64 encoding.
 */
export const encrypt = (text: string): string => {
  if (KEY_NAME == null) { return text } // No encryption key configured, return as is
  const key = getCurrentKey()
  return encryptWithKey(text, key)
}

export const encryptWithKey = (text: string, key: Buffer): string => {
  // no key, no text, or already encrypted, return as is.
  if (key == null || text === null || text.length == 0 || text.startsWith('==')) { 
    return text 
  }
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, iv, CIPHER_OPTIONS)
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
  if (KEY_NAME == null) return encryptedText // No encryption key configured, return as is
  const key =   getCurrentKey()
  const prevKey = getPreviousKey()
  if (key == null || encryptedText == null || !encryptedText.startsWith('=='))
    return encryptedText // Not encrypted
  try {
    return decryptWithKey(encryptedText, key)
  } catch (error) {
    if (error.message?.match(/authenticate/i) && prevKey) {
      return decryptWithKey(encryptedText, prevKey)
    } else {
      throw error // Re-throw if it's not an authentication error
    }
  }
}

export const decryptWithKey = (encryptedText: string, key: Buffer): string => {
  if (key == null || encryptedText == null || !encryptedText.startsWith('==')) {
    return encryptedText // Not encrypted
  }
  const data = Buffer.from(encryptedText.slice(2), 'base64')
  const iv = data.subarray(0, IV_LENGTH)
  const encrypted = data.subarray(IV_LENGTH, data.length - TAG_LENGTH)
  const authTag = data.subarray(data.length - TAG_LENGTH)

  const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, key, iv, CIPHER_OPTIONS)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString('utf8')
}