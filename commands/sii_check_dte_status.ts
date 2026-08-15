import { BaseCommand } from '@adonisjs/core/ace'
import SiiAuthService from '#services/sii/sii_auth_service'
import axios from 'axios'
import env from '#start/env'

export default class SiiCheckDteStatus extends BaseCommand {
    public static commandName = 'sii:check-dte-status'
    public static description = 'Check the status of a specific DTE on the SII test environment'

    public static options = { startApp: true }

    public async run() {
        try {
            const token = await SiiAuthService.getToken()
            const senderRut = env.get('DTE_ENVIO_RUT_ENVIA', '').replace(/\./g, '')
            const [senderRutBase, senderRutDv] = senderRut.split('-')
            
            const companyRut = '76983840-6'
            const [companyRutBase, companyRutDv] = companyRut.split('-')
            
            const receiverRut = '60803000-K'
            const [receiverRutBase, receiverRutDv] = receiverRut.split('-')

            // Specifically target the DTE 33 Folio 55 we just sent
            const dteType = 61
            const folio = 53
            const issueDate = '11-08-2026' // DD-MM-YYYY format for this endpoint
            const totalAmount = 394205 // MntTotal for Folio 53

            const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace">
   <soapenv:Header/>
   <soapenv:Body>
      <def:getEstDte>
         <def:RutConsultante>${senderRutBase}</def:RutConsultante>
         <def:DvConsultante>${senderRutDv}</def:DvConsultante>
         <def:RutCompania>${companyRutBase}</def:RutCompania>
         <def:DvCompania>${companyRutDv}</def:DvCompania>
         <def:RutReceptor>${receiverRutBase}</def:RutReceptor>
         <def:DvReceptor>${receiverRutDv}</def:DvReceptor>
         <def:TipoDte>${dteType}</def:TipoDte>
         <def:FolioDte>${folio}</def:FolioDte>
         <def:FechaEmisionDte>${issueDate}</def:FechaEmisionDte>
         <def:MontoDte>${totalAmount}</def:MontoDte>
         <def:Token>${token}</def:Token>
      </def:getEstDte>
   </soapenv:Body>
</soapenv:Envelope>`

            this.logger.info('Sending request to QueryEstDte.jws...')
            
            const response = await axios.post('https://maullin.sii.cl/DTEWS/QueryEstDte.jws', xmlRequest, {
                headers: {
                    'Content-Type': 'text/xml;charset=UTF-8',
                    'SOAPAction': '""',
                    'Accept': 'text/xml'
                },
                httpsAgent: new (await import('https')).Agent({ rejectUnauthorized: false }),
                timeout: 30000
            })

            console.log(response.data)

        } catch (error) {
            this.logger.error('Failed to check DTE status:')
            console.error(error.response?.data || error.message)
        }
    }
}