import env from '#start/env'
import fs from 'node:fs'
import https from 'https'

interface DteUploadResponse {
  trackId: string | null
  status: string
  rawResponse: string
}

export default class SiiTransmissionService {
  private static getBaseUrl() {
    const environment = env.get('DTE_ENVIRONMENT', 'cert')
    return environment === 'prod' ? 'https://palena.sii.cl' : 'https://maullin.sii.cl'
  }

  public static async sendDte(
    envioDteXml: string,
    token: string,
    senderRut: string,
    companyRut: string
  ): Promise<DteUploadResponse> {
    const url = `${this.getBaseUrl()}/cgi_dte/UPL/DTEUpload`

    const senderRutParts = senderRut.replace(/\./g, '').split('-')
    const companyRutParts = companyRut.replace(/\./g, '').split('-')

    const pRutEmisor = senderRutParts[0]
    const pDigEmisor = senderRutParts[1]
    const pRutEmpresa = companyRutParts[0]
    const pDigEmpresa = companyRutParts[1]

    const boundary = '----SiiBoundary' + Math.random().toString(16).slice(2)
    const crlf = '\r\n'

    // Form data construction as expected by SII
    let payload = ''
    payload += `--${boundary}${crlf}`
    payload += `Content-Disposition: form-data; name="rutSender"${crlf}${crlf}${pRutEmisor}${crlf}`
    payload += `--${boundary}${crlf}`
    payload += `Content-Disposition: form-data; name="dvSender"${crlf}${crlf}${pDigEmisor}${crlf}`
    payload += `--${boundary}${crlf}`
    payload += `Content-Disposition: form-data; name="rutCompany"${crlf}${crlf}${pRutEmpresa}${crlf}`
    payload += `--${boundary}${crlf}`
    payload += `Content-Disposition: form-data; name="dvCompany"${crlf}${crlf}${pDigEmpresa}${crlf}`
    payload += `--${boundary}${crlf}`
    payload += `Content-Disposition: form-data; name="archivo"; filename="envio_${pRutEmpresa}.xml"${crlf}`
    payload += `Content-Type: text/xml${crlf}${crlf}`
    payload += `${envioDteXml}${crlf}`
    payload += `--${boundary}--${crlf}`

    const payloadBuffer = Buffer.from(payload, 'latin1')
    fs.writeFileSync('DTE/payload_sent.txt', payloadBuffer)

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payloadBuffer.length,
        'Accept': 'image/gif, image/x-xbitmap, image/jpeg, image/pjpeg, application/vnd.ms-powerpoint, application/ms-excel, application/msword, */*',
        'Accept-Language': 'es-cl',
        'Cookie': `TOKEN=${token}`,
        'User-Agent': 'Mozilla/4.0 (compatible; PROG 1.0; Windows NT 5.0; YComp 5.0.2.4)',
        'Connection': 'close',
      }
    }

    const responseText = await new Promise<string>((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = ''
        res.on('data', (chunk) => data += chunk)
        res.on('end', () => resolve(data))
      })
      req.on('error', (e) => reject(e))
      req.write(payloadBuffer)
      req.end()
    })

    // The SII responds with an HTML page or XML containing <TRACKID> or <STATUS>
    const trackIdMatch = responseText.match(/<TRACKID>(\d+)<\/TRACKID>/)
    const statusMatch = responseText.match(/<STATUS>([^<]+)<\/STATUS>/)

    const status = statusMatch ? statusMatch[1] : (responseText.includes('RECEPCIONDTE') ? 'OK' : 'ERROR')
    const trackId = trackIdMatch ? trackIdMatch[1] : null

    if (status !== '0' && status !== 'OK' && !trackId) {
       throw new Error(`SII Upload failed. Status: ${status}, Response: ${responseText}`)
    }

    return {
      trackId,
      status,
      rawResponse: responseText,
    }
  }
}
