import { BaseCommand } from '@adonisjs/core/ace'
import SiiXmlBuilderService from '#services/sii/sii_xml_builder_service'
import SiiEnvelopeBuilderService from '#services/sii/sii_envelope_builder_service'
import SiiTransmissionService from '#services/sii/sii_transmission_service'
import SiiAuthService from '#services/sii/sii_auth_service'
import SiiCafFile from '#models/sii/sii_caf_file'
import SiiEnvio from '#models/sii_envio'
import fs from 'fs'
import { DateTime } from 'luxon'

export default class RunSiiTestSet extends BaseCommand {
    public static commandName = 'test:sii'
    public static options = { startApp: true }

    public async run() {
        this.logger.info('Starting SII Test Set Automation...')

        // 1. Seed CAFs manually to objects (we don't need to persist them to DB for the test script)
        const getCafFile = (dteType: number, folio: number) => {
            let cafXml = ''
            if (dteType === 33) {
                cafXml = fs.readFileSync('DTE/FoliosSII76983840331022026815161.xml', 'utf-8')
            } else if (dteType === 61) {
                cafXml = fs.readFileSync('DTE/FoliosSII7698384061862026815161.xml', 'utf-8')
            } else if (dteType === 56) {
                cafXml = fs.readFileSync('DTE/FoliosSII7698384056632026815161.xml', 'utf-8')
            }

            const cafFile = new SiiCafFile()
            cafFile.dteType = dteType
            cafFile.rangeStart = folio
            cafFile.rangeEnd = folio
            cafFile.rawCafXml = cafXml
            return cafFile
        }

        // Sender and issuer RUTs
        const senderRut = '13359181-8'
        const issuerRut = '76983840-6'
        const receiverRut = '60803000-K'

        // Build business and client objects needed by the XML builder service
        const business = {
            rut: '76983840-6',
            name: 'SERVICIOS INTEGRALES GENESSIS SPA',
            acteco: '702000',
            address: 'MIRAFLORES 222',
            city: 'SANTIAGO',
            commune: 'SANTIAGO',
            phone: '',
            businessActivity: 'SERVICIOS INTEGRALES'
        }

        const clients = [
            {
                rut: '76123456-0',
                name: 'CLIENTE DE PRUEBA UNO SPA',
                giro: 'VENTA AL POR MENOR',
                address: 'AVENIDA SIEMPRE VIVA 123',
                city: 'SANTIAGO',
                commune: 'SANTIAGO'
            },
            {
                rut: '77123456-9',
                name: 'CLIENTE DE PRUEBA DOS SPA',
                giro: 'MAYORISTA DE TECNOLOGIA',
                address: 'ALAMEDA 456',
                city: 'SANTIAGO',
                commune: 'SANTIAGO'
            },
            {
                rut: '78123456-7',
                name: 'CLIENTE DE PRUEBA TRES SPA',
                giro: 'SERVICIOS EMPRESARIALES',
                address: 'PROVIDENCIA 789',
                city: 'PROVIDENCIA',
                commune: 'PROVIDENCIA'
            },
            {
                rut: '79123456-5',
                name: 'CLIENTE DE PRUEBA CUATRO SPA',
                giro: 'IMPORTACIONES Y EXPORTACIONES',
                address: 'LAS CONDES 1011',
                city: 'LAS CONDES',
                commune: 'LAS CONDES'
            }
        ]

        // DTE 33 (Factura Electrónica) - 4 cases required
        let startFolio33 = 102
        let folio33 = startFolio33
        // DTE 61 (Nota de Crédito) - 3 cases required
        let startFolio61 = 86
        let folio61 = startFolio61
        // DTE 56 (Nota de Débito) - 1 case required
        let startFolio56 = 63
        let folio56 = startFolio56

        let signedDtes: string[] = []
        let dteTypesCount: Record<number, number> = {}

        const resetBatch = () => {
            signedDtes = []
            dteTypesCount = {}
        }

        const addCase = async (clientIndex: number, dteType: number, folio: number, details: any[], net: number, exempt: number, tax: number, total: number, globalDiscountPct: number | null, references: any[]) => {
            const cafFile = getCafFile(dteType, folio)
            const client = clients[clientIndex]
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
                receiverRut: client.rut,
                netAmount: net,
                exemptAmount: exempt,
                taxAmount: tax,
                totalAmount: total,
                globalDiscountPct
            })

            const XmlSignatureService = (await import('#services/sii/xml_signature_service')).default
            const signedXml = XmlSignatureService.signDteXml(xmlUnsigned)
            signedDtes.push(signedXml)
            dteTypesCount[dteType] = (dteTypesCount[dteType] || 0) + 1
            this.logger.info(`Built Case for DTE ${dteType} Folio ${folio}`)
        }

        const buildEnvelope = (fileName: string) => {
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
            fs.writeFileSync(`DTE/${fileName}`, envelopeSigned)
            this.logger.info(`Saved envelope to DTE/${fileName}`)
            return envelopeSigned
        }

        const sendEnvelope = async (envelope: string) => {
            try {
                const token = await SiiAuthService.getToken()
                const response = await SiiTransmissionService.sendDte(envelope, token, senderRut, issuerRut)

                const { trackId, status, rawResponse } = response

                if (trackId) {
                    this.logger.info(`Sent successfully! TrackID: ${trackId}, Status: ${status}`)

                    await SiiEnvio.create({
                        trackId: trackId,
                        environment: 'certificacion',
                        status: status ?? 'PENDING',
                        rawXmlSent: envelope,
                        consumedFolios: signedDtes.map(dte => {
                            const docMatch = dte.match(/<TipoDTE>(\d+)<\/TipoDTE>.*?<Folio>(\d+)<\/Folio>/s)
                            return docMatch ? { tipo: docMatch[1], folio: docMatch[2] } : null
                        }).filter(Boolean)
                    })
                    this.logger.info('Saved SiiEnvio record to database!')
                } else {
                    this.logger.error(`Error sending: Status: ${status}`)
                    this.logger.info(rawResponse)
                }
            } catch (err) {
                this.logger.error('Failed to transmit envelope to SII:')
                console.error(err)
            }
        }

        const today = DateTime.now().setZone('America/Santiago').toFormat('yyyy-LL-dd')

        // --- SET Reference helper ---
        // Per SII manual section I point 6: every DTE in the Set de Pruebas MUST have
        // a reference with TpoDocRef=SET and RazonRef=CASO 5017006-X as line 1.
        // Commercial references (NC/ND links to invoices) go on line 2 onward.
        const setRef = (caseNumber: number) => ({
            docType: 'SET',
            folio: '5017006',
            date: today,
            code: null,
            reason: `CASO 5017006-${caseNumber}`
        })

        // --- GENERATE ALL 8 CASES ---
        resetBatch()

        // CASE 1: Factura - Cajón AFECTO + Relleno AFECTO
        await addCase(0, 33, folio33++,
            [
                { description: 'Cajón AFECTO', quantity: 169, unitAmount: 3542, amount: 598598 },
                { description: 'Relleno AFECTO', quantity: 71, unitAmount: 5900, amount: 418900 }
            ],
            1017498, 0, 193325, 1210823, null,
            [setRef(1)]
        )

        // CASE 2: Factura - Pañuelo AFECTO (descuento en línea)
        await addCase(1, 33, folio33++,
            [
                { description: 'Pañuelo AFECTO', quantity: 769, unitAmount: 5954, amount: 4120763, discountPct: 10, discountAmount: 457863 },
                { description: 'ITEM 2 AFECTO', quantity: 714, unitAmount: 5004, amount: 2751099, discountPct: 23, discountAmount: 821757 }
            ],
            6871862, 0, 1305654, 8177516, null,
            [setRef(2)]
        )

        // CASE 3: Factura - Pintura B&W AFECTO + exento
        await addCase(2, 33, folio33++,
            [
                { description: 'Pintura B&W AFECTO', quantity: 65, unitAmount: 6956, amount: 452140 },
                { description: 'ITEM 2 AFECTO', quantity: 238, unitAmount: 4047, amount: 963186 },
                { description: 'ITEM 3 SERVICIO EXENTO', quantity: 1, unitAmount: 35304, amount: 35304, indExe: 1 }
            ],
            1415326, 35304, 268912, 1719542, null,
            [setRef(3)]
        )

        // CASE 4: Factura - descuento global 23%
        await addCase(3, 33, folio33++,
            [
                { description: 'ITEM 1 AFECTO', quantity: 421, unitAmount: 6004, amount: 2527684 },
                { description: 'ITEM 2 AFECTO', quantity: 178, unitAmount: 7320, amount: 1302960 },
                { description: 'ITEM 3 SERVICIO EXENTO', quantity: 2, unitAmount: 6834, amount: 13668, indExe: 1 }
            ],
            2949596, 13668, 560423, 3523687, 23,
            [setRef(4)]
        )

        // CASE 5: Nota de Crédito - Corrects Giro (text only, amounts = 0)
        await addCase(0, 61, folio61++,
            [
                { description: 'CORRECCION DE GIRO', quantity: 1, unitAmount: 0, amount: 0 }
            ],
            0, 0, 0, 0, null,
            [
                setRef(5),
                { docType: '33', folio: String(startFolio33), date: today, code: 2, reason: 'CORRIGE GIRO DEL RECEPTOR' }
            ]
        )

        // CASE 6: Nota de Crédito - Partial return (modifies amounts)
        await addCase(1, 61, folio61++,
            [
                { description: 'Pañuelo AFECTO', quantity: 282, unitAmount: 5954, amount: 1511125, discountPct: 10, discountAmount: 167903 },
                { description: 'ITEM 2 AFECTO', quantity: 484, unitAmount: 5004, amount: 1864891, discountPct: 23, discountAmount: 557045 }
            ],
            3376016, 0, 641443, 4017459, null,
            [
                setRef(6),
                { docType: '33', folio: String(startFolio33 + 1), date: today, code: 3, reason: 'DEVOLUCION DE MERCADERIAS' }
            ]
        )

        // CASE 7: Nota de Crédito - Full annulment
        await addCase(2, 61, folio61++,
            [
                { description: 'Pintura B&W AFECTO', quantity: 65, unitAmount: 6956, amount: 452140 },
                { description: 'ITEM 2 AFECTO', quantity: 238, unitAmount: 4047, amount: 963186 },
                { description: 'ITEM 3 SERVICIO EXENTO', quantity: 1, unitAmount: 35304, amount: 35304, indExe: 1 }
            ],
            1415326, 35304, 268912, 1719542, null,
            [
                setRef(7),
                { docType: '33', folio: String(startFolio33 + 2), date: today, code: 1, reason: 'ANULA FACTURA' }
            ]
        )

        // CASE 8: Nota de Débito - Annuls the NC (Case 5)
        await addCase(0, 56, folio56++,
            [
                { description: 'ANULA NOTA DE CREDITO ELECTRONICA', quantity: 1, unitAmount: 0, amount: 0 }
            ],
            0, 0, 0, 0, null,
            [
                setRef(8),
                { docType: '61', folio: String(startFolio61), date: today, code: 1, reason: 'ANULA NOTA DE CREDITO ELECTRONICA' }
            ]
        )

        let envelope = buildEnvelope('EnvioDTE_TestSet.xml')
        await sendEnvelope(envelope)
    }
}

