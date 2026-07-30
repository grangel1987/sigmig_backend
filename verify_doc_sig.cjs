const fs = require('fs')
const crypto = require('crypto')
const xmldom = require('@xmldom/xmldom')
const xmlCrypto = require('xml-crypto')
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

const xml = fs.readFileSync('DTE/Factura33_Folio1.xml', 'latin1')
const doc = new xmldom.DOMParser().parseFromString(xml, 'text/xml')

const signature = doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature')[0]
const sig = new xmlCrypto.SignedXml()

sig.keyInfoProvider = {
    getKeyInfo: () => '<X509Data></X509Data>',
    getKey: () => certificate
}

sig.loadSignature(signature.toString())
const res = sig.checkSignature(xml)
console.log('Document Signature valid:', res)
if (!res) {
    console.log('Errors:', sig.validationErrors)
}
