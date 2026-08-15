import type { HttpContext } from '@adonisjs/core/http'
import SiiAuthService from '#services/sii/sii_auth_service'
import https from 'https'

export default class SiiStatusController {
  public async getTrackStatus({ request, response }: HttpContext) {
    const trackId = request.param('trackId')
    const token = await SiiAuthService.getToken()
    const companyRut = '76983840-6'
    
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

    return response.header('Content-Type', 'text/xml').send(responseText)
  }

  public async getDteStatus({ request, response }: HttpContext) {
    const tipo = request.param('tipo')
    const folio = request.param('folio')
    const monto = request.param('monto')
    const emissionDate = request.input('date', '14082026') // default to today's test date

    const token = await SiiAuthService.getToken()
    const companyRut = '76983840-6'
    
    const companyRutParts = companyRut.replace(/\./g, '').split('-')
    const pRutEmpresa = companyRutParts[0]
    const pDigEmpresa = companyRutParts[1]

    const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace">
   <soapenv:Header/>
   <soapenv:Body>
      <def:getEstDte soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
         <RutConsultante xsi:type="xsd:string">13359181</RutConsultante>
         <DvConsultante xsi:type="xsd:string">8</DvConsultante>
         <RutCompania xsi:type="xsd:string">${pRutEmpresa}</RutCompania>
         <DvCompania xsi:type="xsd:string">${pDigEmpresa}</DvCompania>
         <RutReceptor xsi:type="xsd:string">60803000</RutReceptor>
         <DvReceptor xsi:type="xsd:string">K</DvReceptor>
         <TipoDte xsi:type="xsd:string">${tipo}</TipoDte>
         <FolioDte xsi:type="xsd:string">${folio}</FolioDte>
         <FechaEmisionDte>${emissionDate}</FechaEmisionDte>
         <MontoDte xsi:type="xsd:string">${monto}</MontoDte>
         <Token xsi:type="xsd:string">${token}</Token>
      </def:getEstDte>
   </soapenv:Body>
</soapenv:Envelope>`

    const options = {
        hostname: 'maullin.sii.cl',
        port: 443,
        path: '/DTEWS/QueryEstDte.jws',
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'Content-Length': Buffer.byteLength(soapRequest),
            'SOAPAction': 'getEstDte'
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

    return response.header('Content-Type', 'text/xml').send(responseText)
  }
}
