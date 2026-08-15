import { BaseCommand } from '@adonisjs/core/ace'
import SiiAuthService from '#services/sii/sii_auth_service'
import https from 'https'

export default class SiiQueryStatus extends BaseCommand {
    public static commandName = 'sii:query-status {trackId}'
    public static options = { startApp: true }

    public async run() {
        const trackId = this.args[0]
        const companyRut = '76983840-6'

        this.logger.info(`Getting SII Token...`)
        const token = await SiiAuthService.getToken('13359181-8')
        this.logger.info(`Got token: ${token}`)

        const companyRutParts = companyRut.replace(/\./g, '').split('-')
        const pRutEmpresa = companyRutParts[0]
        const pDigEmpresa = companyRutParts[1]

        const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace">
   <soapenv:Header/>
   <soapenv:Body>
      <def:getEstUp soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
         <RutCompania xsi:type="xsd:string">${pRutEmpresa}</RutCompania>
         <DvCompania xsi:type="xsd:string">${pDigEmpresa}</DvCompania>
         <TrackId xsi:type="xsd:string">${trackId}</TrackId>
         <Token xsi:type="xsd:string">${token}</Token>
      </def:getEstUp>
   </soapenv:Body>
</soapenv:Envelope>`

        this.logger.info(`Sending Query to QueryEstUp.jws...`)

        const options = {
            hostname: 'maullin.sii.cl',
            port: 443,
            path: '/DTEWS/QueryEstUp.jws',
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'Content-Length': Buffer.byteLength(soapRequest),
                'SOAPAction': 'getEstUp'
            }
        }

        const responseText = await new Promise<string>((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = ''
                res.on('data', (chunk) => data += chunk)
                res.on('end', () => resolve(data))
            })
            req.on('error', (e) => reject(e))
            req.write(soapRequest)
            req.end()
        })

        this.logger.info(`Response:\n${responseText}`)
    }
}
