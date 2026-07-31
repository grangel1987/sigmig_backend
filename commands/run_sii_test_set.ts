import { BaseCommand } from '@adonisjs/core/ace'
import SiiXmlBuilderService from '#services/sii/sii_xml_builder_service'
import SiiEnvelopeBuilderService from '#services/sii/sii_envelope_builder_service'
import SiiTransmissionService from '#services/sii/sii_transmission_service'
import SiiAuthService from '#services/sii/sii_auth_service'
import SiiCafFile from '#models/sii/sii_caf_file'
import fs from 'fs'
import path from 'path'
import { DateTime } from 'luxon'

export default class RunSiiTestSet extends BaseCommand {
    public static commandName = 'test:sii'
    public static options = { startApp: true }

    public async run() {
        this.logger.info('Starting SII Test Set Automation...')

        // 1. Seed CAFs manually to objects (we don't need to persist them to DB for the test script)
        const dteDir = 'DTE'
        const cafFiles = {
            33: fs.readFileSync(path.join(dteDir, 'FoliosSII7698384033512026729221.xml'), 'utf8'),
            61: fs.readFileSync(path.join(dteDir, 'FoliosSII7698384061502026729224.xml'), 'utf8'),
            56: fs.readFileSync(path.join(dteDir, 'FoliosSII7698384056502026729225.xml'), 'utf8'),
        }

        const getCafFile = (dteType: number) => {
            const rawCafXml = cafFiles[dteType as keyof typeof cafFiles]
            const cafFile = new SiiCafFile()
            cafFile.dteType = dteType
            cafFile.rawCafXml = rawCafXml
            cafFile.encryptedPrivateKeyRef = null // it will fall back to rawCafXml for the key
            return cafFile
        }

        // Common data
        const issuerRut = '76983840-6'
        const receiverRut = '60803000-K'
        const senderRut = '13359181-8'

        const business = {
            name: 'SERVICIOS INTEGRALES GENESSIS SPA',
            giro: 'ACTIVIDADES DE CONSULTORIA DE GESTION',
            acteco: 702000,
            address: 'J MARTINEZ 512 ST 7 MZ 14 CENTRO ESTACION',
            municipality: 'DIEGO DE ALMAGRO',
            city: 'DIEGO DE ALMAGRO'
        }
        const client = {
            name: 'JORGE GONZALEZ LTDA',
            giro: 'COMPUTACION',
            address: 'SAN DIEGO 2222',
            municipality: 'SANTIAGO',
            city: 'SANTIAGO'
        }

        // DTE 33 (Factura Electrónica) - 4 cases required. CAF range: 51-61
        const startFolio33 = 51
        let folio33 = startFolio33
        // DTE 61 (Nota de Crédito) - 3 cases required. CAF range: 50-59
        const startFolio61 = 50
        let folio61 = startFolio61
        // DTE 56 (Nota de Débito) - 1 case required. CAF range: 50-60
        const startFolio56 = 50
        let folio56 = startFolio56

        const signedDtes: string[] = []
        const dteTypesCount: Record<number, number> = { 33: 0, 61: 0, 56: 0 }

        const addCase = async (dteType: number, folio: number, details: any[], net: number, exempt: number, tax: number, total: number, globalDiscountPct: number | null, references: any[]) => {
            const cafFile = getCafFile(dteType)
            const sale = {
                business,
                client,
                details,
                references
            } as any

            const { xmlUnsigned } = SiiXmlBuilderService.buildDraftArtifacts({
                sale,
                cafFile,
                dteType,
                folio,
                issuedAt: DateTime.now().setZone('America/Santiago'),
                issuerRut,
                receiverRut,
                netAmount: net,
                exemptAmount: exempt,
                taxAmount: tax,
                totalAmount: total,
                globalDiscountPct
            })

            const XmlSignatureService = (await import('#services/sii/xml_signature_service')).default
            const signedXml = XmlSignatureService.signDteXml(xmlUnsigned)
            signedDtes.push(signedXml)
            dteTypesCount[dteType]++
            this.logger.info(`Built Case for DTE ${dteType} Folio ${folio}`)
        }

        // CASE 1: Factura 33
        // 133 x 1466 = 194978, 57 x 2391 = 136287. Net = 331265. Tax = 62940. Total = 394205
        await addCase(33, folio33++,
            [
                { description: 'Cajon AFECTO', quantity: 133, unitAmount: 1466, amount: 194978 },
                { description: 'Relleno AFECTO', quantity: 57, unitAmount: 2391, amount: 136287 },
            ], 331265, 0, 62940, 394205, null, [])

        // CASE 2: Factura 33
        // 346 x 2761 = 955306 (-5% = 907541). 276 x 1822 = 502872 (-9% = 457614). 
        // Net = 1365155, Tax = 259379, Total = 1624534
        await addCase(33, folio33++,
            [
                { description: 'Panuelo AFECTO', quantity: 346, unitAmount: 2761, amount: 907541, discountPct: 5, discountAmount: 47765 },
                { description: 'ITEM 2 AFECTO', quantity: 276, unitAmount: 1822, amount: 457614, discountPct: 9, discountAmount: 45258 },
            ], 1365155, 0, 259379, 1624534, null, [])

        // CASE 3: Factura 33
        // 28 x 3072 = 86016. 167 x 3129 = 522543. (Net = 608559, Tax = 115626)
        // 1 x 34829 = 34829 (Exempt = 34829)
        // Total = 608559 + 115626 + 34829 = 759014
        await addCase(33, folio33++,
            [
                { description: 'Pintura B&W AFECTO', quantity: 28, unitAmount: 3072, amount: 86016 },
                { description: 'ITEM 2 AFECTO', quantity: 167, unitAmount: 3129, amount: 522543 },
                { description: 'ITEM 3 SERVICIO EXENTO', quantity: 1, unitAmount: 34829, amount: 34829, indExe: 1 },
            ], 608559, 34829, 115626, 759014, null, [])

        // CASE 4: Factura 33
        // 151 x 2570 = 388070, 65 x 2631 = 171015 (Subnet = 559085). 10% global discount = 55909. Net = 503176, Tax = 95603.
        // 2 x 6781 = 13562 (Exempt).
        // Total = 503176 + 95603 + 13562 = 612341
        await addCase(33, folio33++,
            [
                { description: 'ITEM 1 AFECTO', quantity: 151, unitAmount: 2570, amount: 388070 },
                { description: 'ITEM 2 AFECTO', quantity: 65, unitAmount: 2631, amount: 171015 },
                { description: 'ITEM 3 SERVICIO EXENTO', quantity: 2, unitAmount: 6781, amount: 13562, indExe: 1 },
            ], 503176, 13562, 95603, 612341, 10, [])

        // CASE 5: Nota Credito 61
        // Refers to Case 1 (Folio startFolio33). Corrects Giro.
        await addCase(61, folio61++,
            [
                { description: 'Cajon AFECTO', quantity: 133, unitAmount: 1466, amount: 194978 },
                { description: 'Relleno AFECTO', quantity: 57, unitAmount: 2391, amount: 136287 },
            ], 331265, 0, 62940, 394205, null, [
            { docType: '33', folio: String(startFolio33), date: DateTime.now().setZone('America/Santiago').toFormat('yyyy-LL-dd'), code: 2, reason: 'CORRIGE GIRO DEL RECEPTOR' }
        ])

        // CASE 6: Nota Credito 61
        // Refers to Case 2 (Folio startFolio33+1). Returns merchandise.
        // 127 x 2761 (-5%) = 333068. 187 x 1822 (-9%) = 310037.
        // Net = 643105, Tax = 122190, Total = 765295
        await addCase(61, folio61++,
            [
                { description: 'Panuelo AFECTO', quantity: 127, unitAmount: 2761, amount: 333068, discountPct: 5, discountAmount: 17532 },
                { description: 'ITEM 2 AFECTO', quantity: 187, unitAmount: 1822, amount: 310037, discountPct: 9, discountAmount: 30664 },
            ], 643105, 0, 122190, 765295, null, [
            { docType: '33', folio: String(startFolio33 + 1), date: DateTime.now().setZone('America/Santiago').toFormat('yyyy-LL-dd'), code: 3, reason: 'DEVOLUCION DE MERCADERIAS' }
        ])

        // CASE 7: Nota Credito 61
        // Refers to Case 3 (Folio startFolio33+2). Anula Factura. Total amounts match Case 3.
        await addCase(61, folio61++,
            [
                { description: 'Pintura B&W AFECTO', quantity: 28, unitAmount: 3072, amount: 86016 },
                { description: 'ITEM 2 AFECTO', quantity: 167, unitAmount: 3129, amount: 522543 },
                { description: 'ITEM 3 SERVICIO EXENTO', quantity: 1, unitAmount: 34829, amount: 34829, indExe: 1 },
            ], 608559, 34829, 115626, 759014, null, [
            { docType: '33', folio: String(startFolio33 + 2), date: DateTime.now().setZone('America/Santiago').toFormat('yyyy-LL-dd'), code: 1, reason: 'ANULA FACTURA' }
        ])

        // CASE 8: Nota Debito 56
        // Refers to Case 5 (NC Folio startFolio61). Anula Nota de Credito. Total amounts match Case 5.
        await addCase(56, folio56++,
            [
                { description: 'Cajon AFECTO', quantity: 133, unitAmount: 1466, amount: 194978 },
                { description: 'Relleno AFECTO', quantity: 57, unitAmount: 2391, amount: 136287 },
            ], 331265, 0, 62940, 394205, null, [
            { docType: '61', folio: String(startFolio61), date: DateTime.now().setZone('America/Santiago').toFormat('yyyy-LL-dd'), code: 1, reason: 'ANULA NOTA DE CREDITO ELECTRONICA' }
        ])

        // Envelope
        this.logger.info('Building SetDTE envelope...')
        const dteTypesArray = Object.entries(dteTypesCount)
            .filter(([_, count]) => count > 0)
            .map(([type, count]) => ({ type: Number(type), count }))

        const { envelopeSigned } = SiiEnvelopeBuilderService.buildSignedEnvelope({
            signedDteXmls: signedDtes,
            dteTypes: dteTypesArray,
            senderRut,
            issuerRut,
            receiverRut,
            resolutionDate: '2026-07-28',
            resolutionNumber: 0,
        })

        fs.writeFileSync('DTE/EnvioDTE_TestSet.xml', envelopeSigned)
        this.logger.info('Saved envelope to DTE/EnvioDTE_TestSet.xml')

        // Authenticate and Send
        try {
            const token = await SiiAuthService.getToken()
            this.logger.info(`Authenticated with token: ${token}`)

            const response = await SiiTransmissionService.sendDte(envelopeSigned, token, senderRut, issuerRut)
            this.logger.info(`Sent successfully! TrackID: ${response.trackId}, Status: ${response.status}`)
            console.log(response)
        } catch (err) {
            this.logger.error('Failed to transmit envelope to SII:')
            console.error(err)
        }
    }
}
