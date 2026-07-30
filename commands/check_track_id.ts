import { BaseCommand, args } from '@adonisjs/core/ace'
import env from '#start/env'
import SiiAuthService from '#services/sii/sii_auth_service'

export default class CheckTrackId extends BaseCommand {
  public static commandName = 'sii:check-dte'
  public static options = { startApp: true }

  @args.string({ description: 'DTE Type (e.g. 33)' })
  declare tipo: string

  @args.string({ description: 'Folio (e.g. 1)' })
  declare folio: string

  @args.string({ description: 'Amount (e.g. 394205)' })
  declare amount: string

  public async run() {
    try {
        const token = await SiiAuthService.getToken()
        
        const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace">
   <soapenv:Header/>
   <soapenv:Body>
      <def:getEstDte>
         <RutConsultante>13359181</RutConsultante>
         <DvConsultante>8</DvConsultante>
         <RutCompania>76983840</RutCompania>
         <DvCompania>6</DvCompania>
         <RutReceptor>60803000</RutReceptor>
         <DvReceptor>K</DvReceptor>
         <TipoDte>${this.tipo}</TipoDte>
         <FolioDte>${this.folio}</FolioDte>
         <FechaEmisionDte>2026-07-29</FechaEmisionDte>
         <MontoDte>${this.amount}</MontoDte>
         <Token>${token}</Token>
      </def:getEstDte>
   </soapenv:Body>
</soapenv:Envelope>`

        const baseUrl = env.get('DTE_ENVIRONMENT', 'cert') === 'prod' ? 'https://palena.sii.cl' : 'https://maullin.sii.cl'
        const url = `${baseUrl}/DTEWS/QueryEstDte.jws`
        
        this.logger.info(`Sending request to ${url}`)
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml;charset=UTF-8',
                'SOAPAction': '',
            },
            body: soapEnvelope
        })
        
        const responseText = await response.text()
        console.log(responseText)
    } catch(e) {
        console.error(e)
    }
  }
}
