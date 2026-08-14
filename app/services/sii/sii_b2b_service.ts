import { DateTime } from 'luxon'
import XmlSignatureService from './xml_signature_service.js'
import { create } from 'xmlbuilder2'

export interface AcuseReciboParams {
    rutResponde: string
    rutRecibe: string
    idRespuesta: string
    nmbEnvio: string
    fchRecep: string
    codEnvio: string
    envioDteId: string
    digest: string
    rutEmisor: string
    rutReceptor: string
    estadoRecepEnv: number
    recepEnvGlosa: string
    dtes: Array<{
        tipoDte: number
        folio: number
        fchEmis: string
        rutEmisor: string
        rutRecep: string
        mntTotal: number
        estadoRecepDte: number
        recepDteGlosa: string
    }>
}

export interface AprobacionComercialParams {
    rutResponde: string
    rutRecibe: string
    idRespuesta: string
    dtes: Array<{
        tipoDte: number
        folio: number
        fchEmis: string
        rutEmisor: string
        rutRecep: string
        mntTotal: number
        codEnvio: string
        estadoDte: number
        estadoDteGlosa: string
    }>
}

export default class SiiB2bService {
    /**
     * Builds and signs an Acuse de Recibo XML (Ley 20.956)
     */
    public static buildAcuseRecibo(params: AcuseReciboParams): string {
        const tmstFirmaResp = DateTime.now().setZone('America/Santiago').toFormat("yyyy-MM-dd'T'HH:mm:ss")
        
        const doc = create({ version: '1.0', encoding: 'ISO-8859-1' })
            .ele('RespuestaDTE', {
                version: '1.0',
                'xmlns': 'http://www.sii.cl/SiiDte',
                'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                'xsi:schemaLocation': 'http://www.sii.cl/SiiDte RespuestaEnvioDTE_v10.xsd'
            })
            .ele('Resultado', { ID: 'Resultado' })
                .ele('Caratula', { version: '1.0' })
                    .ele('RutResponde').txt(params.rutResponde).up()
                    .ele('RutRecibe').txt(params.rutRecibe).up()
                    .ele('IdRespuesta').txt(params.idRespuesta).up()
                    .ele('NroDetalles').txt(params.dtes.length.toString()).up()
                    .ele('TmstFirmaResp').txt(tmstFirmaResp).up()
                .up()
                .ele('RecepcionEnvio')
                    .ele('NmbEnvio').txt(params.nmbEnvio).up()
                    .ele('FchRecep').txt(params.fchRecep).up()
                    .ele('CodEnvio').txt(params.codEnvio).up()
                    .ele('EnvioDTEID').txt(params.envioDteId).up()
                    .ele('Digest').txt(params.digest).up()
                    .ele('RutEmisor').txt(params.rutEmisor).up()
                    .ele('RutReceptor').txt(params.rutReceptor).up()
                    .ele('EstadoRecepEnv').txt(params.estadoRecepEnv.toString()).up()
                    .ele('RecepEnvGlosa').txt(params.recepEnvGlosa).up()
                    .ele('NroDTE').txt(params.dtes.length.toString()).up()

        for (const dte of params.dtes) {
            doc.ele('RecepcionDTE')
                .ele('TipoDTE').txt(dte.tipoDte.toString()).up()
                .ele('Folio').txt(dte.folio.toString()).up()
                .ele('FchEmis').txt(dte.fchEmis).up()
                .ele('RUTEmisor').txt(dte.rutEmisor).up()
                .ele('RUTRecep').txt(dte.rutRecep).up()
                .ele('MntTotal').txt(dte.mntTotal.toString()).up()
                .ele('EstadoRecepDTE').txt(dte.estadoRecepDte.toString()).up()
                .ele('RecepDTEGlosa').txt(dte.recepDteGlosa).up()
            .up()
        }

        doc.up().up().up() // Close RecepcionEnvio, Resultado, RespuestaDTE

        let xmlUnsigned = doc.end({ prettyPrint: false })
        
        // Remove empty namespaces injected by xmlbuilder2 if any
        xmlUnsigned = xmlUnsigned.replace(/ xmlns=""/g, '')

        return XmlSignatureService.signXml({
            xml: xmlUnsigned,
            referenceXPath: '//*[@ID="Resultado"]',
            signatureParentXPath: '/*[local-name()="RespuestaDTE"]',
            referenceUri: '#Resultado',
            getSiiKeyInfo: true
        })
    }

    /**
     * Builds and signs an Aprobacion Comercial XML (Ley 19.983)
     */
    public static buildAprobacionComercial(params: AprobacionComercialParams): string {
        const tmstFirmaResp = DateTime.now().setZone('America/Santiago').toFormat("yyyy-MM-dd'T'HH:mm:ss")
        
        const doc = create({ version: '1.0', encoding: 'ISO-8859-1' })
            .ele('RespuestaDTE', {
                version: '1.0',
                'xmlns': 'http://www.sii.cl/SiiDte',
                'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                'xsi:schemaLocation': 'http://www.sii.cl/SiiDte RespuestaEnvioDTE_v10.xsd'
            })
            .ele('Resultado', { ID: 'Resultado' })
                .ele('Caratula', { version: '1.0' })
                    .ele('RutResponde').txt(params.rutResponde).up()
                    .ele('RutRecibe').txt(params.rutRecibe).up()
                    .ele('IdRespuesta').txt(params.idRespuesta).up()
                    .ele('NroDetalles').txt(params.dtes.length.toString()).up()
                    .ele('TmstFirmaResp').txt(tmstFirmaResp).up()
                .up()

        for (const dte of params.dtes) {
            doc.ele('ResultadoDTE')
                .ele('TipoDTE').txt(dte.tipoDte.toString()).up()
                .ele('Folio').txt(dte.folio.toString()).up()
                .ele('FchEmis').txt(dte.fchEmis).up()
                .ele('RUTEmisor').txt(dte.rutEmisor).up()
                .ele('RUTRecep').txt(dte.rutRecep).up()
                .ele('MntTotal').txt(dte.mntTotal.toString()).up()
                .ele('CodEnvio').txt(dte.codEnvio).up()
                .ele('EstadoDTE').txt(dte.estadoDte.toString()).up()
                .ele('EstadoDTEGlosa').txt(dte.estadoDteGlosa).up()
            .up()
        }

        doc.up().up() // Close Resultado, RespuestaDTE

        let xmlUnsigned = doc.end({ prettyPrint: false })
        
        // Remove empty namespaces injected by xmlbuilder2 if any
        xmlUnsigned = xmlUnsigned.replace(/ xmlns=""/g, '')

        return XmlSignatureService.signXml({
            xml: xmlUnsigned,
            referenceXPath: '//*[@ID="Resultado"]',
            signatureParentXPath: '/*[local-name()="RespuestaDTE"]',
            referenceUri: '#Resultado',
            getSiiKeyInfo: true
        })
    }
}
