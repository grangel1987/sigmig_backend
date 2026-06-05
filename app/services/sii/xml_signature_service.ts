import env from '#start/env'
import { SignedXml } from 'xml-crypto'

const XML_C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
const XML_RSA_SHA1 = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1'
const XML_SHA1 = 'http://www.w3.org/2000/09/xmldsig#sha1'

interface XmlSignOptions {
    xml: string
    referenceXPath: string
    signatureParentXPath: string
    referenceUri: string
}

function normalizePem(value: string | undefined) {
    if (!value) {
        return null
    }

    const normalized = value.replace(/\\n/g, '\n').trim()
    return normalized.length ? normalized : null
}

function getSigningCredentials() {
    return {
        privateKey: normalizePem(env.get('DTE_SIGNING_PRIVATE_KEY')),
        certificate: normalizePem(env.get('DTE_SIGNING_CERTIFICATE')),
    }
}

function extractDocumentId(xml: string) {
    const match = xml.match(/<Documento[^>]*\sID="([^"]+)"/i)
    return match?.[1] ?? null
}

export default class XmlSignatureService {
    public static isConfigured() {
        const { privateKey, certificate } = getSigningCredentials()
        return Boolean(privateKey && certificate)
    }

    public static signXml(options: XmlSignOptions) {
        const { privateKey, certificate } = getSigningCredentials()

        if (!privateKey || !certificate) {
            throw new Error('DTE XML signing certificate/private key is not configured')
        }

        const signer = new SignedXml({
            privateKey,
            publicCert: certificate,
            signatureAlgorithm: XML_RSA_SHA1,
            canonicalizationAlgorithm: XML_C14N,
        })

        signer.addReference({
            xpath: options.referenceXPath,
            transforms: [XML_C14N],
            digestAlgorithm: XML_SHA1,
            uri: options.referenceUri,
        })

        signer.computeSignature(options.xml, {
            location: {
                reference: options.signatureParentXPath,
                action: 'append',
            },
        })

        return signer.getSignedXml()
    }

    public static signDteXml(xmlUnsigned: string) {
        const documentId = extractDocumentId(xmlUnsigned)

        if (!documentId) {
            throw new Error('Unsigned DTE XML is missing Documento ID')
        }

        return this.signXml({
            xml: xmlUnsigned,
            referenceXPath: "//*[local-name()='Documento']",
            signatureParentXPath: "//*[local-name()='DTE']",
            referenceUri: `#${documentId}`,
        })
    }
}