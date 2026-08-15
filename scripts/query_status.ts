import SiiAuthService from '../app/services/sii/sii_auth_service.js'
import https from 'https'

async function run() {
    const trackId = process.argv[2]
    if (!trackId) {
        console.error('Please provide a Track ID as the first argument')
        process.exit(1)
    }

    const companyRut = '76983840-6'

    console.log(`Getting SII Token...`)
    const token = await SiiAuthService.getToken('13359181-8')
    console.log(`Got token: ${token}`)

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
         <TipoDte xsi:type="xsd:string">33</TipoDte>
         <FolioDte xsi:type="xsd:string">75</FolioDte>
         <FechaEmisionDte>14082026</FechaEmisionDte>
         <MontoDte xsi:type="xsd:string">8177516</MontoDte>
         <Token xsi:type="xsd:string">${token}</Token>
      </def:getEstDte>
   </soapenv:Body>
</soapenv:Envelope>`

    console.log(`Sending Query to QueryEstDte.jws for Folio 75...`)

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

    console.log(`Response:\n${responseText}`)
    process.exit(0)
}

run()
