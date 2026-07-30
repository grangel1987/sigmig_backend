const forge = require('node-forge')
const dotenv = require('dotenv')
dotenv.config()

function cleanPem(raw, type) {
    const b64 = raw.replace(/-----BEGIN (.*?)-----/g, '')
                   .replace(/-----END (.*?)-----/g, '')
                   .replace(/\\n/g, '')
                   .replace(/\s+/g, '')
    return `-----BEGIN ${type}-----\n` + (b64.match(/.{1,64}/g) || []).join('\n') + `\n-----END ${type}-----\n`
}

const certificate = cleanPem(process.env.DTE_SIGNING_CERTIFICATE || '', 'CERTIFICATE')
const certForge = forge.pki.certificateFromPem(certificate)
const publicKey = certForge.publicKey
let hex = publicKey.n.toString(16)
if (hex.length % 2 !== 0) hex = '0' + hex
const modulusBase64 = Buffer.from(hex, 'hex').toString('base64')
console.log(modulusBase64)
