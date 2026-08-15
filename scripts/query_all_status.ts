import SiiAuthService from '../app/services/sii/sii_auth_service.js'
import https from 'https'

const companyRut = '76983840-6'
const rutReceptor = '60803000'
const dvReceptor = 'K'
const fechaEmision = '14082026'

// All 8 test cases for TrackID 0254462780
const cases = [
    { label: 'Case 1 - Factura 33', tipoDte: '33', folio: '74', monto: '1210823' },
    { label: 'Case 2 - Factura 33 (desc. línea)', tipoDte: '33', folio: '75', monto: '8177516' },
    { label: 'Case 3 - Factura 33', tipoDte: '33', folio: '76', monto: '1719542' },
    { label: 'Case 4 - Factura 33 (desc. global)', tipoDte: '33', folio: '77', monto: '3523687' },
    { label: 'Case 5 - NC 61 (corrige texto)', tipoDte: '61', folio: '65', monto: '0' },
    { label: 'Case 6 - NC 61 (devolución)', tipoDte: '61', folio: '66', monto: '4017459' },
    { label: 'Case 7 - NC 61 (anula)', tipoDte: '61', folio: '67', monto: '1719542' },
    { label: 'Case 8 - ND 56 (anula NC)', tipoDte: '56', folio: '56', monto: '0' },
]

function querySoap(soapRequest: string): Promise<string> {
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

function extractField(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
    return match ? match[1] : '?'
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function run() {
    const companyRutParts = companyRut.replace(/\./g, '').split('-')
    const pRutEmpresa = companyRutParts[0]
    const pDigEmpresa = companyRutParts[1]

    console.log('Getting SII Token...')
    const token = await SiiAuthService.getToken('13359181-8')
    console.log(`Got token: ${token}\n`)

    for (const c of cases) {
        const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace">
   <soapenv:Header/>
   <soapenv:Body>
      <def:getEstDte soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
         <RutConsultante xsi:type="xsd:string">13359181</RutConsultante>
         <DvConsultante xsi:type="xsd:string">8</DvConsultante>
         <RutCompania xsi:type="xsd:string">${pRutEmpresa}</RutCompania>
         <DvCompania xsi:type="xsd:string">${pDigEmpresa}</DvCompania>
         <RutReceptor xsi:type="xsd:string">${rutReceptor}</RutReceptor>
         <DvReceptor xsi:type="xsd:string">${dvReceptor}</DvReceptor>
         <TipoDte xsi:type="xsd:string">${c.tipoDte}</TipoDte>
         <FolioDte xsi:type="xsd:string">${c.folio}</FolioDte>
         <FechaEmisionDte>${fechaEmision}</FechaEmisionDte>
         <MontoDte xsi:type="xsd:string">${c.monto}</MontoDte>
         <Token xsi:type="xsd:string">${token}</Token>
      </def:getEstDte>
   </soapenv:Body>
</soapenv:Envelope>`

        const raw = await querySoap(soap)
        // Unescape the double-encoded XML inside the SOAP response
        const inner = raw.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#xd;/g, '')
        const estado = extractField(inner, 'ESTADO')
        const errCode = extractField(inner, 'ERR_CODE')
        const glosaErr = extractField(inner, 'GLOSA_ERR')
        const icon = (estado === 'DOK' || errCode === '0') ? '\u2705' : ((['11','13','14','15'].includes(errCode)) ? '\u26a0\ufe0f' : '\u274c')
        console.log(`${icon} ${c.label} (Folio ${c.folio}): ESTADO=${estado}, ERR=${errCode} - ${glosaErr}`)
        if (estado === '?' || errCode === '?') {
            // Print the raw response for diagnosis
            const respHdr = inner.match(/<SII:RESP_HDR>(.*?)<\/SII:RESP_HDR>/s)
            console.log(`   RAW HDR: ${respHdr ? respHdr[1].replace(/\s+/g, ' ').trim() : inner.substring(0, 400)}`)
        }
        await sleep(2500)
    }

    process.exit(0)
}

run()
