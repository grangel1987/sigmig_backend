import { BaseCommand } from '@adonisjs/core/ace'
import SiiB2bService from '#services/sii/sii_b2b_service'
import fs from 'fs'
import path from 'path'
import { XMLParser } from 'fast-xml-parser'
import { DateTime } from 'luxon'

export default class RunSiiB2bTest extends BaseCommand {
    public static commandName = 'test:sii-b2b'
    public static description = 'Simulates receiving an EnvioDTE and generates the required B2B responses'

    public static options = { startApp: true }

    public async run() {
        this.logger.info('Starting B2B Exchange Simulation...')

        const envelopePath = path.join('DTE', 'EnvioDTE_TestSet.xml')
        if (!fs.existsSync(envelopePath)) {
            this.logger.error('Could not find EnvioDTE_TestSet.xml. Run test:sii first.')
            return
        }

        const xmlContent = fs.readFileSync(envelopePath, 'utf8')
        
        // Use regex to find the digest of the incoming file (we need this for the Acuse)
        // Usually you'd calculate the digest of the incoming file or read its signature
        // For simulation, we'll just mock a digest
        const mockDigest = 'KXuHbAxtWWtQ+nSAJkYuoJKNcau658gjirmJZHW72B5feRiTBKHnuGmKGNAjFasr+u7skEbl0eArlpChudaZGQ=='

        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
        const parsed = parser.parse(xmlContent)
        
        const envioDte = parsed.EnvioDTE
        const caratula = envioDte.SetDTE.Caratula

        const senderRut = caratula.RutEmisor
        const receiverRut = caratula.RutReceptor

        this.logger.info(`Parsed incoming envelope from ${senderRut} to ${receiverRut}`)

        let dtesArray = envioDte.SetDTE.DTE
        if (!Array.isArray(dtesArray)) {
            dtesArray = [dtesArray]
        }

        const dteDetails = dtesArray.map((dteNode: any) => {
            const doc = dteNode.Documento
            const enc = doc.Encabezado
            return {
                tipoDte: parseInt(enc.IdDoc.TipoDTE),
                folio: parseInt(enc.IdDoc.Folio),
                fchEmis: enc.IdDoc.FchEmis,
                rutEmisor: enc.Emisor.RUTEmisor,
                rutRecep: enc.Receptor.RUTRecep,
                mntTotal: parseInt(enc.Totales.MntTotal)
            }
        })

        // 1. Build Acuse de Recibo
        this.logger.info('Generating Acuse de Recibo (RespuestaEnvioDTE)...')
        
        const acuseParams = {
            rutResponde: receiverRut, // We are the receiver responding
            rutRecibe: senderRut,     // We send it back to the sender
            idRespuesta: '1',
            nmbEnvio: 'EnvioDTE_TestSet.xml',
            fchRecep: DateTime.now().setZone('America/Santiago').toFormat("yyyy-MM-dd'T'HH:mm:ss"),
            codEnvio: '123456',
            envioDteId: envioDte.SetDTE['@_ID'],
            digest: mockDigest,
            rutEmisor: senderRut,
            rutReceptor: receiverRut,
            estadoRecepEnv: 0, // 0 = Aceptado
            recepEnvGlosa: 'Envio Recibido Conforme',
            dtes: dteDetails.map((d: any) => ({
                ...d,
                estadoRecepDte: 0, // 0 = DTE Recibido OK
                recepDteGlosa: 'DTE Recibido OK'
            }))
        }

        const acuseXml = SiiB2bService.buildAcuseRecibo(acuseParams)
        const acusePath = path.join('DTE', 'Acuse_Recibo.xml')
        fs.writeFileSync(acusePath, acuseXml)
        this.logger.success(`Saved Acuse de Recibo to ${acusePath}`)

        // 2. Build Aprobacion Comercial
        this.logger.info('Generating Aprobacion Comercial (RespuestaDTE)...')

        const aprobacionParams = {
            rutResponde: receiverRut,
            rutRecibe: senderRut,
            idRespuesta: '2',
            dtes: dteDetails.map((d: any) => ({
                ...d,
                codEnvio: '123456',
                estadoDte: 0, // 0 = Aceptado Comercial
                estadoDteGlosa: 'Aceptado Comercial'
            }))
        }

        const aprobacionXml = SiiB2bService.buildAprobacionComercial(aprobacionParams)
        const aprobacionPath = path.join('DTE', 'Aprobacion_Comercial.xml')
        fs.writeFileSync(aprobacionPath, aprobacionXml)
        this.logger.success(`Saved Aprobacion Comercial to ${aprobacionPath}`)
    }
}