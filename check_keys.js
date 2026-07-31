import dotenv from 'dotenv'
import crypto from 'crypto'
dotenv.config()

function cleanPem(raw, type) {
    const b64 = raw.replace(/-----BEGIN (.*?)-----/g, '')
                   .replace(/-----END (.*?)-----/g, '')
                   .replace(/\\n/g, '')
                   .replace(/\s+/g, '')
    return `-----BEGIN ${type}-----\n` + (b64.match(/.{1,64}/g) || []).join('\n') + `\n-----END ${type}-----\n`
}

const privateKey = cleanPem(process.env.DTE_SIGNING_PRIVATE_KEY || '', 'RSA PRIVATE KEY')
const certificate = cleanPem(process.env.DTE_SIGNING_CERTIFICATE || '', 'CERTIFICATE')

try {
    const pubKeyFromPriv = crypto.createPublicKey(privateKey)
    const pubKeyFromCert = crypto.createPublicKey(certificate)

    console.log('KEYS MATCH:', pubKeyFromPriv.export({ format: 'pem', type: 'spki' }) === pubKeyFromCert.export({ format: 'pem', type: 'spki' }))
} catch(e) {
    console.error(e)
}
