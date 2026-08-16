import { DateTime } from 'luxon'
import XmlSignatureService from '#services/sii/xml_signature_service'

export interface LibroCVDetalle {
    TpoDoc: number
    NroDoc: number
    TasaImp?: number
    FchDoc: string
    RUTDoc: string
    RznSoc?: string
    TpoDocRef?: number
    FolioDocRef?: number
    MntExe: number
    MntNeto: number
    MntIVA: number
    MntTotal: number
    IndSinCosto?: number
    IVANoRec?: { CodIVANoRec: number, MntIVANoRec: number }
    IVAUsoComun?: number
    IVARetTotal?: number
    IVANoRetenido?: number
}

export interface LibroCVPayload {
    rutEmisor: string
    rutEnvia: string
    periodoTributario: string // YYYY-MM
    fchResol: string // YYYY-MM-DD
    nroResol: number
    tipoOperacion: 'VENTA' | 'COMPRA'
    tipoLibro: 'ESPECIAL' | 'MENSUAL' | 'RECTIFICA'
    tipoEnvio: 'TOTAL' | 'PARCIAL' | 'FINAL' | 'AJUSTE'
    folioNotificacion?: number
    fctProp?: number // Factor proporcionalidad IVA (e.g. 0.60)
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
        const id = `LIBRO_${payload.tipoOperacion}_${payload.periodoTributario.replace('-', '')}`
        const tmstFirmaEnv = DateTime.now().setZone('America/Santiago').toFormat("yyyy-LL-dd'T'HH:mm:ss")

        // Group by TpoDoc to build ResumenPeriodo
        const summary: Record<number, { 
            count: number, exeCount: number, exe: number, neto: number, iva: number, total: number,
            opIvaUsoComun: number, ivaUsoComun: number,
            opIvaRetTotal: number, ivaRetTotal: number,
            ivaNoRec: Record<number, { count: number, mnt: number }>
        }> = {}

        for (const det of payload.detalles) {
            if (!summary[det.TpoDoc]) {
                summary[det.TpoDoc] = { 
                    count: 0, exeCount: 0, exe: 0, neto: 0, iva: 0, total: 0,
                    opIvaUsoComun: 0, ivaUsoComun: 0,
                    opIvaRetTotal: 0, ivaRetTotal: 0,
                    ivaNoRec: {}
                }
            }
            summary[det.TpoDoc].count += 1
            if (det.MntExe !== 0) summary[det.TpoDoc].exeCount += 1
            summary[det.TpoDoc].exe += det.MntExe
            summary[det.TpoDoc].neto += det.MntNeto
            summary[det.TpoDoc].iva += det.MntIVA
            summary[det.TpoDoc].total += det.MntTotal
            
            if (det.IVAUsoComun) {
                summary[det.TpoDoc].opIvaUsoComun += 1
                summary[det.TpoDoc].ivaUsoComun += det.IVAUsoComun
            }
            if (det.IVARetTotal) {
                summary[det.TpoDoc].opIvaRetTotal += 1
                summary[det.TpoDoc].ivaRetTotal += det.IVARetTotal
            }
            if (det.IVANoRec) {
                if (!summary[det.TpoDoc].ivaNoRec[det.IVANoRec.CodIVANoRec]) {
                    summary[det.TpoDoc].ivaNoRec[det.IVANoRec.CodIVANoRec] = { count: 0, mnt: 0 }
                }
                summary[det.TpoDoc].ivaNoRec[det.IVANoRec.CodIVANoRec].count += 1
                summary[det.TpoDoc].ivaNoRec[det.IVANoRec.CodIVANoRec].mnt += det.IVANoRec.MntIVANoRec
            }
        }

        const resumenXmlLines = []
        for (const tpoDoc of Object.keys(summary).map(Number).sort((a, b) => a - b)) {
            const sum = summary[tpoDoc]
            resumenXmlLines.push('      <TotalesPeriodo>')
            resumenXmlLines.push(`        <TpoDoc>${tpoDoc}</TpoDoc>`)
            resumenXmlLines.push(`        <TotDoc>${sum.count}</TotDoc>`)
            if (sum.exeCount > 0) resumenXmlLines.push(`        <TotOpExe>${sum.exeCount}</TotOpExe>`)
            resumenXmlLines.push(`        <TotMntExe>${integerAmount(sum.exe)}</TotMntExe>`)
            resumenXmlLines.push(`        <TotMntNeto>${integerAmount(sum.neto)}</TotMntNeto>`)
            resumenXmlLines.push(`        <TotMntIVA>${integerAmount(sum.iva)}</TotMntIVA>`)
            
            if (Object.keys(sum.ivaNoRec).length > 0) {
                for (const cod of Object.keys(sum.ivaNoRec).map(Number).sort((a,b)=>a-b)) {
                    resumenXmlLines.push('        <TotIVANoRec>')
                    resumenXmlLines.push(`          <CodIVANoRec>${cod}</CodIVANoRec>`)
                    resumenXmlLines.push(`          <TotOpIVANoRec>${sum.ivaNoRec[cod].count}</TotOpIVANoRec>`)
                    resumenXmlLines.push(`          <TotMntIVANoRec>${integerAmount(sum.ivaNoRec[cod].mnt)}</TotMntIVANoRec>`)
                    resumenXmlLines.push('        </TotIVANoRec>')
                }
            }
            
            if (sum.opIvaUsoComun > 0) {
                resumenXmlLines.push(`        <TotOpIVAUsoComun>${sum.opIvaUsoComun}</TotOpIVAUsoComun>`)
                resumenXmlLines.push(`        <TotIVAUsoComun>${integerAmount(sum.ivaUsoComun)}</TotIVAUsoComun>`)
                if (payload.fctProp !== undefined) {
                    resumenXmlLines.push(`        <FctProp>${payload.fctProp.toFixed(2)}</FctProp>`)
                    resumenXmlLines.push(`        <TotCredIVAUsoComun>${integerAmount(sum.ivaUsoComun * payload.fctProp)}</TotCredIVAUsoComun>`)
                }
            }
            
            if (sum.opIvaRetTotal > 0) {
                resumenXmlLines.push(`        <TotOpIVARetTotal>${sum.opIvaRetTotal}</TotOpIVARetTotal>`)
                resumenXmlLines.push(`        <TotIVARetTotal>${integerAmount(sum.ivaRetTotal)}</TotIVARetTotal>`)
            }
            
            resumenXmlLines.push(`        <TotMntTotal>${integerAmount(sum.total)}</TotMntTotal>`)
            resumenXmlLines.push('      </TotalesPeriodo>')
        }

        const sortedDetalles = [...payload.detalles].sort((a, b) => {
            if (a.TpoDoc !== b.TpoDoc) return a.TpoDoc - b.TpoDoc
            return a.NroDoc - b.NroDoc
        })

        const detalleXmlLines = sortedDetalles.map(det => {
            const lines = [
                '      <Detalle>',
                `        <TpoDoc>${det.TpoDoc}</TpoDoc>`,
                `        <NroDoc>${det.NroDoc}</NroDoc>`,
                det.IndSinCosto ? `        <IndSinCosto>${det.IndSinCosto}</IndSinCosto>` : '',
                det.MntIVA > 0 ? `        <TasaImp>${det.TasaImp || 19}</TasaImp>` : '',
                `        <FchDoc>${det.FchDoc}</FchDoc>`,
                `        <RUTDoc>${det.RUTDoc}</RUTDoc>`,
                det.RznSoc ? `        <RznSoc>${escapeXml(truncate(det.RznSoc, 50))}</RznSoc>` : '',
                det.TpoDocRef ? `        <TpoDocRef>${det.TpoDocRef}</TpoDocRef>` : '',
                det.FolioDocRef ? `        <FolioDocRef>${det.FolioDocRef}</FolioDocRef>` : '',
                det.MntExe !== 0 ? `        <MntExe>${integerAmount(det.MntExe)}</MntExe>` : '',
                `        <MntNeto>${integerAmount(det.MntNeto)}</MntNeto>`,
                `        <MntIVA>${integerAmount(det.MntIVA)}</MntIVA>`,
                det.IVANoRec ? `        <IVANoRec>\n          <CodIVANoRec>${det.IVANoRec.CodIVANoRec}</CodIVANoRec>\n          <MntIVANoRec>${det.IVANoRec.MntIVANoRec}</MntIVANoRec>\n        </IVANoRec>` : '',
                det.IVAUsoComun ? `        <IVAUsoComun>${integerAmount(det.IVAUsoComun)}</IVAUsoComun>` : '',
                det.IVARetTotal ? `        <IVARetTotal>${integerAmount(det.IVARetTotal)}</IVARetTotal>` : '',
                `        <MntTotal>${integerAmount(det.MntTotal)}</MntTotal>`,
                det.IVANoRetenido !== undefined ? `        <IVANoRetenido>${integerAmount(det.IVANoRetenido)}</IVANoRetenido>` : '',
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
