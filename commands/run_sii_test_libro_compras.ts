import { BaseCommand } from '@adonisjs/core/ace'
import SiiLibroXmlBuilderService from '#services/sii/sii_libro_xml_builder_service'
import fs from 'node:fs/promises'
import SiiAuthService from '#services/sii/sii_auth_service'
import SiiTransmissionService from '#services/sii/sii_transmission_service'

export default class RunSiiTestLibroCompras extends BaseCommand {
    public static commandName = 'test:libro_compras'
    public static description = 'Generates and submits the Libro de Compras (IECV) for SII certification'

    public async run() {
        this.logger.info('Starting Libro de Compras Automation...')

        try {
            const today = '2026-08-16' // Or dynamic

            // 1. Factura 234: Afecto 52294
            const case1 = {
                TpoDoc: 30, NroDoc: 234, FchDoc: today, RUTDoc: '76123456-0', RznSoc: 'PROVEEDOR UNO SPA',
                MntExe: 0, MntNeto: 52294, MntIVA: Math.round(52294 * 0.19),
                get MntTotal() { return this.MntNeto + this.MntIVA }
            }

            // 2. Factura Electronica 32: Exento 10579, Afecto 11325
            const case2 = {
                TpoDoc: 33, NroDoc: 32, FchDoc: today, RUTDoc: '76123456-0', RznSoc: 'PROVEEDOR UNO SPA',
                MntExe: 10579, MntNeto: 11325, MntIVA: Math.round(11325 * 0.19),
                get MntTotal() { return this.MntExe + this.MntNeto + this.MntIVA }
            }

            // 3. Factura 781: Afecto 30159 (IVA uso comun factor 0.60)
            const case3 = {
                TpoDoc: 30, NroDoc: 781, FchDoc: today, RUTDoc: '76123456-0', RznSoc: 'PROVEEDOR UNO SPA',
                MntExe: 0, MntNeto: 30159, MntIVA: 0, // IVA is reported in IVAUsoComun
                IVAUsoComun: Math.round(30159 * 0.19),
                get MntTotal() { return this.MntNeto + this.IVAUsoComun }
            }

            // 4. Nota de Credito 451: Descuento a Factura 234. Afecto 2922
            const case4 = {
                TpoDoc: 60, NroDoc: 451, FchDoc: today, RUTDoc: '76123456-0', RznSoc: 'PROVEEDOR UNO SPA',
                TpoDocRef: 30, FolioDocRef: 234,
                MntExe: 0, MntNeto: 2922, MntIVA: Math.round(2922 * 0.19),
                get MntTotal() { return this.MntNeto + this.MntIVA }
            }

            // 5. Factura Electronica 67: Entrega Gratuita del proveedor. Afecto 12072
            // Entrega gratuita has IndSinCosto = 1. Its IVA is usually Not Recoverable (Código 4).
            const iva67 = Math.round(12072 * 0.19)
            const case5 = {
                TpoDoc: 33, NroDoc: 67, FchDoc: today, RUTDoc: '76123456-0', RznSoc: 'PROVEEDOR UNO SPA',
                IndSinCosto: 1,
                MntExe: 0, MntNeto: 12072, MntIVA: 0, // IVA recuperable is 0
                IVANoRec: { CodIVANoRec: 4, MntIVANoRec: iva67 }, // 4 = Entrega gratuita
                get MntTotal() { return this.MntNeto + iva67 }
            }

            // 6. Factura de Compra Electronica 9: Compra con retencion total del IVA. Afecto 10600
            const iva9 = Math.round(10600 * 0.19)
            const case6 = {
                TpoDoc: 46, NroDoc: 9, FchDoc: today, RUTDoc: '77123456-9', RznSoc: 'PROVEEDOR DOS SPA',
                MntExe: 0, MntNeto: 10600, MntIVA: iva9, // Is it in MntIVA? Yes, but also in IVARetTotal
                IVARetTotal: iva9,
                IVANoRetenido: 0,
                get MntTotal() { return this.MntNeto + this.MntIVA }
            }

            // 7. Nota de Credito 211: Descuento a Factura Electronica 32. Afecto 8915
            const case7 = {
                TpoDoc: 60, NroDoc: 211, FchDoc: today, RUTDoc: '76123456-0', RznSoc: 'PROVEEDOR UNO SPA',
                TpoDocRef: 33, FolioDocRef: 32,
                MntExe: 0, MntNeto: 8915, MntIVA: Math.round(8915 * 0.19),
                get MntTotal() { return this.MntNeto + this.MntIVA }
            }

            const payload = {
                rutEmisor: '76983840-6',
                rutEnvia: '13359181-8',
                periodoTributario: '2026-08',
                fchResol: '2026-07-28',
                nroResol: 0,
                tipoOperacion: 'COMPRA' as const,
                tipoLibro: 'ESPECIAL' as const,
                tipoEnvio: 'TOTAL' as const,
                folioNotificacion: 2, // The Folio for this specific submission
                fctProp: 0.60,
                detalles: [case1, case2, case3, case4, case5, case6, case7]
            }

            const xml = await SiiLibroXmlBuilderService.buildLibro(payload)

            await fs.writeFile('DTE/EnvioLibro_TestSet_Compras.xml', xml)
            this.logger.info('Saved envelope to DTE/EnvioLibro_TestSet_Compras.xml')

            // Fetch token and transmit
            const token = await SiiAuthService.getToken()
            if (!token) {
                this.logger.error('Failed to get SII token.')
                return
            }

            try {
                const result = await SiiTransmissionService.sendDte(xml, token, payload.rutEnvia, payload.rutEmisor)
                this.logger.info(`Sent successfully! TrackID: ${result.trackId}, Status: ${result.status}`)
            } catch (e: any) {
                this.logger.error('Failed to transmit envelope to SII:')
                this.logger.error(e.message)
            }

        } catch (error) {
            console.error('Error in test:', error)
        }
    }
}
