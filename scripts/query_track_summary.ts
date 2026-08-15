import SiiAuthService from '../app/services/sii/sii_auth_service.js'
import https from 'https'

const companyRut = '76983840-6'
const trackId = '0254469518'

function querySoap(soapRequest: string): Promise<string> {
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
    return new Promise<string>((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = ''
            res.on('data', (chunk) => data += chunk)
            res.on('end', () => resolve(data))
        })
        req.on('error', (e) => reject(e))
        req.write(soapRequest)
        req.end()
    })
}

async function run() {
    const companyRutParts = companyRut.replace(/\./g, '').split('-')
    const pRutEmpresa = companyRutParts[0]
    const pDigEmpresa = companyRutParts[1]

    console.log('Getting SII Token...')
    const token = await SiiAuthService.getToken('13359181-8')
    console.log(`Got token: ${token}\n`)

    const soap = `<?xml version="1.0" encoding="UTF-8"?>
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

    const raw = await querySoap(soap)
    const inner = raw.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#xd;/g, '')
    
    console.log('--- ENVELOPE STATUS RESPONSE ---')
    console.log(inner)
    console.log('--------------------------------')

    process.exit(0)
}

run()
