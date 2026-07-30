import { BaseCommand } from '@adonisjs/core/ace'
import SiiAuthService from '#services/sii/sii_auth_service'

export default class CheckDteStatus extends BaseCommand {
  public static commandName = 'test:check_dte'
  public static options = { startApp: true }

  public async run() {
    const token = await SiiAuthService.getToken()
    const envelope = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://DefaultNamespace"><soapenv:Header/><soapenv:Body><def:getEstDte><RutConsultante>13359181</RutConsultante><DvConsultante>8</DvConsultante><RutCompania>76983840</RutCompania><DvCompania>6</DvCompania><RutReceptor>60803000</RutReceptor><DvReceptor>K</DvReceptor><TipoDte>61</TipoDte><FolioDte>50</FolioDte><FechaEmisionDte>29-07-2026</FechaEmisionDte><MontoDte>394205</MontoDte><Token>${token}</Token></def:getEstDte></soapenv:Body></soapenv:Envelope>`;
    
    const res = await fetch('https://maullin.sii.cl/DTEWS/QueryEstDte.jws', {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml', 'SOAPAction': '' },
        body: envelope
    })
    
    const text = await res.text()
    console.log(text)
  }
}
