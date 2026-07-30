const fs = require('fs')
const crypto = require('crypto')
const xmldom = require('@xmldom/xmldom')
const xmlCrypto = require('xml-crypto')

const xml = fs.readFileSync('DTE/Factura33_Folio1.xml', 'utf8')
const doc = new xmldom.DOMParser().parseFromString(xml, 'text/xml')

const signature = doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature')[0]
const sig = new xmlCrypto.SignedXml()
sig.keyInfoProvider = new xmlCrypto.FileKeyInfo('cert.pem')
sig.loadSignature(signature.toString())
const res = sig.checkSignature(xml)
console.log('Signature valid:', res)
if (!res) {
    console.log('Errors:', sig.validationErrors)
}
