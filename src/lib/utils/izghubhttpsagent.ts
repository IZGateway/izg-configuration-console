import https from 'https'
import * as fs from 'fs'
import path from 'path'

const IZG_ENDPOINT_CRT_PATH = process.env.IZG_ENDPOINT_CRT_PATH || ''
const IZG_ENDPOINT_KEY_PATH = process.env.IZG_ENDPOINT_KEY_PATH || ''
const IZG_ENDPOINT_PASSCODE = process.env.IZG_ENDPOINT_PASSCODE || ''
const args: {
  rejectUnauthorized: boolean;
  keepAlive: boolean;
  cert?: Buffer;
  key?: Buffer;
  passphrase?: string;
} = {
  rejectUnauthorized: false,
  keepAlive: true,
}
if (IZG_ENDPOINT_CRT_PATH) {
  args.cert = fs.readFileSync(path.resolve(__dirname, IZG_ENDPOINT_CRT_PATH))
}
if (IZG_ENDPOINT_KEY_PATH) {
  args.key = fs.readFileSync(path.resolve(__dirname, IZG_ENDPOINT_KEY_PATH))
}
if (IZG_ENDPOINT_PASSCODE) {
  args.passphrase = IZG_ENDPOINT_PASSCODE  
}

export const IZGHubHttpsAgent = new https.Agent(args) 
