import env from '#start/env'
import { SignedXml } from 'xml-crypto'
import forge from 'node-forge'

const XML_C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
const XML_RSA_SHA1 = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1'
const XML_SHA1 = 'http://www.w3.org/2000/09/xmldsig#sha1'

interface XmlSignOptions {
    xml: string
    referenceXPath: string
    signatureParentXPath: string
    referenceUri: string
    getSiiKeyInfo?: boolean
}

function normalizePem(value: string | undefined) {
    if (!value) {
        return null
    }

    const normalized = value.replace(/\\n/g, '\n').replace(/\r/g, '').trim()
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

    private static getSiiKeyInfoContent(certificate: string) {
        return ({ prefix }: { prefix?: string }) => {
            prefix = prefix ? prefix + ':' : ''
            const certBody = certificate
                .replace(/-----BEGIN CERTIFICATE-----/g, '')
                .replace(/-----END CERTIFICATE-----/g, '')
                .replace(/\s+/g, '')

            // Split cert body into 64 char chunks
            const chunks = certBody.match(/.{1,64}/g)?.join('\n') || certBody

            let modulusBase64 = ''
            try {
                const pureBase64 = certificate.replace(/-----BEGIN CERTIFICATE-----/g, '').replace(/-----END CERTIFICATE-----/g, '').replace(/\s+/g, '')
                const cleanPem = `-----BEGIN CERTIFICATE-----\n${pureBase64}\n-----END CERTIFICATE-----`
                const certForge = forge.pki.certificateFromPem(cleanPem)
                const publicKey = certForge.publicKey as forge.pki.rsa.PublicKey
                let hex = publicKey.n.toString(16)
                if (hex.length % 2 !== 0) hex = '0' + hex
                modulusBase64 = Buffer.from(hex, 'hex').toString('base64')
            } catch (e) {
                console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
                console.error('Error extracting modulus:', e)
                console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
            }

            const rsaKeyValue = modulusBase64 ? `<${prefix}KeyValue>\n<${prefix}RSAKeyValue>\n<${prefix}Modulus>${modulusBase64}</${prefix}Modulus>\n<${prefix}Exponent>AQAB</${prefix}Exponent>\n</${prefix}RSAKeyValue>\n</${prefix}KeyValue>\n` : ''

            return `${rsaKeyValue}<${prefix}X509Data>\n<${prefix}X509Certificate>\n${chunks}\n</${prefix}X509Certificate>\n</${prefix}X509Data>`
        }
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
            getKeyInfoContent: this.getSiiKeyInfoContent(certificate) as any,
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

    public static signSeedXml(seedXml: string) {
        return this.signXml({
            xml: seedXml,
            referenceXPath: "//*[local-name()='getToken']",
            signatureParentXPath: "//*[local-name()='getToken']",
            referenceUri: '',
        })
    }
}