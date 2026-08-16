import { BaseCommand } from '@adonisjs/core/ace'

import fs from 'node:fs'
import SiiLibroXmlBuilderService, { LibroCVPayload } from '#services/sii/sii_libro_xml_builder_service'
import SiiAuthService from '#services/sii/sii_auth_service'
import SiiTransmissionService from '#services/sii/sii_transmission_service'

export default class RunSiiTestLibro extends BaseCommand {
    static commandName = 'test:libro'
    static description = 'Generates and transmits the Libro de Ventas (IECV) for the Certification Test Set'

    async run() {
        this.logger.info('Starting Libro de Ventas Automation...')

        const today = '2026-08-15' // Must match exactly the date when EnvioDTE_TestSet.xml was submitted
        const periodo = '2026-08' // YYYY-MM

        const payload: LibroCVPayload = {
            rutEmisor: '76983840-6',
            rutEnvia: '13359181-8',
            periodoTributario: periodo,
            fchResol: '2026-07-28',
            nroResol: 0,
            tipoOperacion: 'VENTA',
            tipoLibro: 'ESPECIAL',
            tipoEnvio: 'TOTAL',
            folioNotificacion: 1,
            detalles: [
                {
                    TpoDoc: 33, NroDoc: 102, FchDoc: today, RUTDoc: '76123456-0', RznSoc: 'CLIENTE DE PRUEBA UNO SPA',
                    MntExe: 0, MntNeto: 1017498, MntIVA: 193325, MntTotal: 1210823
                },
                {
                    TpoDoc: 33, NroDoc: 103, FchDoc: today, RUTDoc: '77123456-9', RznSoc: 'CLIENTE DE PRUEBA DOS SPA',
                    MntExe: 0, MntNeto: 6871862, MntIVA: 1305654, MntTotal: 8177516
                },
                {
                    TpoDoc: 33, NroDoc: 104, FchDoc: today, RUTDoc: '78123456-7', RznSoc: 'CLIENTE DE PRUEBA TRES SPA',
                    MntExe: 35304, MntNeto: 1415326, MntIVA: 268912, MntTotal: 1719542
                },
                {
                    TpoDoc: 33, NroDoc: 105, FchDoc: today, RUTDoc: '79123456-5', RznSoc: 'CLIENTE DE PRUEBA CUATRO SPA',
                    MntExe: 13668, MntNeto: 2949596, MntIVA: 560423, MntTotal: 3523687
                },
                {
                    TpoDoc: 61, NroDoc: 86, FchDoc: today, RUTDoc: '76123456-0', RznSoc: 'CLIENTE DE PRUEBA UNO SPA',
                    TpoDocRef: 33, FolioDocRef: 102,
                    MntExe: 0, MntNeto: 0, MntIVA: 0, MntTotal: 0
                },
                {
                    TpoDoc: 61, NroDoc: 87, FchDoc: today, RUTDoc: '77123456-9', RznSoc: 'CLIENTE DE PRUEBA DOS SPA',
                    TpoDocRef: 33, FolioDocRef: 103,
                    MntExe: 0, MntNeto: -3376016, MntIVA: -641443, MntTotal: -4017459
                },
                {
                    TpoDoc: 61, NroDoc: 88, FchDoc: today, RUTDoc: '78123456-7', RznSoc: 'CLIENTE DE PRUEBA TRES SPA',
                    TpoDocRef: 33, FolioDocRef: 104,
                    MntExe: -35304, MntNeto: -1415326, MntIVA: -268912, MntTotal: -1719542
                },
                {
                    TpoDoc: 56, NroDoc: 63, FchDoc: today, RUTDoc: '76123456-0', RznSoc: 'CLIENTE DE PRUEBA UNO SPA',
                    TpoDocRef: 61, FolioDocRef: 86,
                    MntExe: 0, MntNeto: 0, MntIVA: 0, MntTotal: 0
                }
            ]
        }

        const libroXml = await SiiLibroXmlBuilderService.buildLibro(payload)

        // Validate structure manually
        fs.writeFileSync('DTE/EnvioLibro_TestSet.xml', libroXml, { encoding: 'latin1' })
        this.logger.info('Saved envelope to DTE/EnvioLibro_TestSet.xml')

        // Fetch token and transmit
        const token = await SiiAuthService.getToken()
        if (!token) {
            this.logger.error('Failed to get SII token.')
            return
        }

        try {
            const result = await SiiTransmissionService.sendDte(libroXml, token, payload.rutEnvia, payload.rutEmisor)
            this.logger.info(`Sent successfully! TrackID: ${result.trackId}, Status: ${result.status}`)
        } catch (e: any) {
            this.logger.error('Failed to transmit envelope to SII:')
            this.logger.error(e.message)
        }
    }
}
