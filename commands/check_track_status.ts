import { BaseCommand, args } from '@adonisjs/core/ace'
import env from '#start/env'
import SiiAuthService from '#services/sii/sii_auth_service'

export default class CheckTrackStatus extends BaseCommand {
  public static commandName = 'sii:check-track-status'
  public static options = { startApp: true }

  @args.string({ description: 'Track ID (e.g. 253482682)' })
  declare trackId: string

  public async run() {
    try {
        const token = await SiiAuthService.getToken()
        
        const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace">
   <soapenv:Header/>
   <soapenv:Body>
      <def:getEstUp>
         <def:RutCompania>76983840</def:RutCompania>
         <def:DvCompania>6</def:DvCompania>
         <def:TrackId>${this.trackId}</def:TrackId>
         <def:Token>${token}</def:Token>
      </def:getEstUp>
   </soapenv:Body>
</soapenv:Envelope>`

        const baseUrl = env.get('DTE_ENVIRONMENT', 'cert') === 'prod' ? 'https://palena.sii.cl' : 'https://maullin.sii.cl'
        const url = `${baseUrl}/DTEWS/QueryEstUp.jws`
        
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
