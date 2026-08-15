import { DateTime } from 'luxon'
import XmlSignatureService from '#services/sii/xml_signature_service'

export interface LibroCVDetalle {
    TpoDoc: number
    NroDoc: number
    TasaImp?: number
    FchDoc: string
    RUTDoc: string
    RznSoc?: string
    MntExe: number
    MntNeto: number
    MntIVA: number
    MntTotal: number
}

export interface LibroCVPayload {
    rutEmisor: string
    rutEnvia: string
    periodoTributario: string // YYYY-MM
    fchResol: string // YYYY-MM-DD
    nroResol: number
    tipoOperacion: 'VENTA' | 'COMPRA'
    tipoLibro: 'ESPECIAL' | 'MENSUAL' | 'RECTIFICA'
    tipoEnvio: 'TOTAL' | 'PARCIAL' | 'FINAL'
    folioNotificacion?: number
    detalles: LibroCVDetalle[]
}

function escapeXml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function truncate(value: unknown, maxLength: number): string {
    return String(value ?? '').substring(0, maxLength)
}

function integerAmount(value: unknown): string {
    return String(Math.round(Number(value ?? 0) || 0))
}

export default class SiiLibroXmlBuilderService {
    public static async buildLibro(payload: LibroCVPayload): Promise<string> {
        const id = `LIBRO_VENTAS_${payload.periodoTributario.replace('-', '')}`
        const tmstFirmaEnv = DateTime.now().setZone('America/Santiago').toFormat("yyyy-LL-dd'T'HH:mm:ss")

        // Group by TpoDoc to build ResumenPeriodo
        const summary: Record<number, { count: number, exe: number, neto: number, iva: number, total: number }> = {}

        for (const det of payload.detalles) {
            if (!summary[det.TpoDoc]) {
                summary[det.TpoDoc] = { count: 0, exe: 0, neto: 0, iva: 0, total: 0 }
            }
            summary[det.TpoDoc].count += 1
            summary[det.TpoDoc].exe += det.MntExe
            summary[det.TpoDoc].neto += det.MntNeto
            summary[det.TpoDoc].iva += det.MntIVA
            summary[det.TpoDoc].total += det.MntTotal
        }

        const resumenXmlLines = []
        for (const tpoDoc of Object.keys(summary).map(Number).sort((a, b) => a - b)) {
            const sum = summary[tpoDoc]
            resumenXmlLines.push('      <TotalesPeriodo>')
            resumenXmlLines.push(`        <TpoDoc>${tpoDoc}</TpoDoc>`)
            resumenXmlLines.push(`        <TotDoc>${sum.count}</TotDoc>`)
            if (sum.exe > 0) resumenXmlLines.push(`        <TotMntExe>${integerAmount(sum.exe)}</TotMntExe>`)
            if (sum.neto > 0) resumenXmlLines.push(`        <TotMntNeto>${integerAmount(sum.neto)}</TotMntNeto>`)
            if (sum.iva > 0) resumenXmlLines.push(`        <TotMntIVA>${integerAmount(sum.iva)}</TotMntIVA>`)
            resumenXmlLines.push(`        <TotMntTotal>${integerAmount(sum.total)}</TotMntTotal>`)
            resumenXmlLines.push('      </TotalesPeriodo>')
        }

        const detalleXmlLines = payload.detalles.map(det => {
            const lines = [
                '      <Detalle>',
                `        <TpoDoc>${det.TpoDoc}</TpoDoc>`,
                `        <NroDoc>${det.NroDoc}</NroDoc>`,
                det.TasaImp ? `        <TasaImp>${det.TasaImp}</TasaImp>` : '',
                `        <FchDoc>${det.FchDoc}</FchDoc>`,
                `        <RUTDoc>${det.RUTDoc}</RUTDoc>`,
                det.RznSoc ? `        <RznSoc>${escapeXml(truncate(det.RznSoc, 50))}</RznSoc>` : '',
                det.MntExe > 0 ? `        <MntExe>${integerAmount(det.MntExe)}</MntExe>` : '',
                det.MntNeto > 0 ? `        <MntNeto>${integerAmount(det.MntNeto)}</MntNeto>` : '',
                det.MntIVA > 0 ? `        <MntIVA>${integerAmount(det.MntIVA)}</MntIVA>` : '',
                `        <MntTotal>${integerAmount(det.MntTotal)}</MntTotal>`,
                '      </Detalle>'
            ]
            return lines.filter(Boolean).join('\n')
        })

        const caratulaLines = [
            '    <Caratula>',
            `      <RutEmisorLibro>${payload.rutEmisor}</RutEmisorLibro>`,
            `      <RutEnvia>${payload.rutEnvia}</RutEnvia>`,
            `      <PeriodoTributario>${payload.periodoTributario}</PeriodoTributario>`,
            `      <FchResol>${payload.fchResol}</FchResol>`,
            `      <NroResol>${payload.nroResol}</NroResol>`,
            `      <TipoOperacion>${payload.tipoOperacion}</TipoOperacion>`,
            `      <TipoLibro>${payload.tipoLibro}</TipoLibro>`,
            `      <TipoEnvio>${payload.tipoEnvio}</TipoEnvio>`,
            payload.folioNotificacion ? `      <FolioNotificacion>${payload.folioNotificacion}</FolioNotificacion>` : '',
            '    </Caratula>',
        ].filter(Boolean).join('\n')

        const envioLibroUnsigned = [
            '<?xml version="1.0" encoding="ISO-8859-1"?>',
            '<LibroCompraVenta xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sii.cl/SiiDte LibroCV_v10.xsd" version="1.0">',
            `  <EnvioLibro ID="${id}">`,
            caratulaLines,
            '    <ResumenPeriodo>',
            resumenXmlLines.join('\n'),
            '    </ResumenPeriodo>',
            detalleXmlLines.join('\n'),
            `    <TmstFirma>${tmstFirmaEnv}</TmstFirma>`,
            '  </EnvioLibro>',
            '</LibroCompraVenta>'
        ].join('\n')

        const finalXml = XmlSignatureService.signXml({
            xml: envioLibroUnsigned,
            referenceXPath: "//*[local-name()='EnvioLibro']",
            signatureParentXPath: "//*[local-name()='LibroCompraVenta']",
            referenceUri: `#${id}`,
        })

        return finalXml
    }
}
