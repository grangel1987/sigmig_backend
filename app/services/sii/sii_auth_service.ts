import env from '#start/env'
import XmlSignatureService from '#services/sii/xml_signature_service'

export default class SiiAuthService {
  private static getBaseUrl() {
    const environment = env.get('DTE_ENVIRONMENT', 'cert')
    return environment === 'prod' ? 'https://palena.sii.cl' : 'https://maullin.sii.cl'
  }

  public static async getSeed(): Promise<string> {
    const url = `${this.getBaseUrl()}/DTEWS/CrSeed.jws`
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace">
  <soapenv:Header/>
  <soapenv:Body>
    <def:getSeed/>
  </soapenv:Body>
</soapenv:Envelope>`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': '""',
      },
      body: soapEnvelope,
    })

    if (!response.ok) {
      throw new Error(`Failed to get seed from SII: ${response.status} ${response.statusText}`)
    }

    const xml = await response.text()
    const decodedXml = xml.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    const seedMatch = decodedXml.match(/<SEMILLA>(\d+)<\/SEMILLA>/)
    if (!seedMatch) {
      throw new Error('Could not parse SEMILLA from SII response')
    }

    return seedMatch[1]
  }

  public static async getToken(): Promise<string> {
    const seed = await this.getSeed()

    const getTokenXml = `<getToken><item><Semilla>${seed}</Semilla></item></getToken>`
    const signedXml = XmlSignatureService.signSeedXml(getTokenXml)

    const url = `${this.getBaseUrl()}/DTEWS/GetTokenFromSeed.jws`
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace">
  <soapenv:Header/>
  <soapenv:Body>
    <def:getToken>
      <pszXml>${signedXml.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pszXml>
    </def:getToken>
  </soapenv:Body>
</soapenv:Envelope>`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': '""',
      },
      body: soapEnvelope,
    })

    if (!response.ok) {
      throw new Error(`Failed to get token from SII: ${response.status} ${response.statusText}`)
    }

    const xml = await response.text()
    const decodedXml = xml.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    const tokenMatch = decodedXml.match(/<TOKEN>([^<]+)<\/TOKEN>/)
    
    if (!tokenMatch) {
      // SII returns errors in <GLOSA> e.g. <GLOSA>Firma del Token inválida</GLOSA>
      const glosaMatch = decodedXml.match(/<GLOSA>([^<]+)<\/GLOSA>/)
      throw new Error(`Could not parse TOKEN from SII response. Glosa: ${glosaMatch ? glosaMatch[1] : 'Unknown error'}`)
    }

    return tokenMatch[1]
  }
}
