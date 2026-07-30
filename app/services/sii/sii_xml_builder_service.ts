import Sale from '#models/sales/sale'
import SiiCafFile from '#models/sii/sii_caf_file'
import TedService from '#services/sii/ted_service'
import { DateTime } from 'luxon'

interface SaleRelationShape {
    name?: string | null
    giro?: string | null
    address?: string | null
    city?: string | null
    municipality?: string | null
    acteco?: number | null
}

type SaleDetailShape = {
    lineNumber?: number | null
    description?: string | null
    quantity?: number | null
    unitAmount?: number | null
    amount?: number | null
    discountPct?: number | null
    discountAmount?: number | null
    indExe?: number | null
}

type SaleReferenceShape = {
    lineNumber?: number
    docType?: string
    folio?: string
    date?: string
    code?: string | number
    reason?: string
}

type SaleWithDteRelations = Sale & {
    business?: SaleRelationShape | null
    client?: SaleRelationShape | null
    details?: SaleDetailShape[] | null
    references?: SaleReferenceShape[] | null
}

interface DraftArtifactsPayload {
    sale: SaleWithDteRelations
    cafFile: SiiCafFile
    dteType: number
    folio: number
    issuedAt?: DateTime | null
    issuerRut?: string | null
    receiverRut?: string | null
    netAmount: number
    exemptAmount: number
    taxAmount: number
    totalAmount: number
    globalDiscountPct?: number | null
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

function formatDate(value?: DateTime | null, fallback?: string | null) {
    if (value && value.isValid) {
        return value.toFormat('yyyy-LL-dd')
    }

    if (fallback) {
        const parsed = DateTime.fromISO(fallback)
        if (parsed.isValid) {
            return parsed.toFormat('yyyy-LL-dd')
        }
    }

    return DateTime.now().setZone('America/Santiago').toFormat('yyyy-LL-dd')
}

function optionalTag(tagName: string, value: unknown) {
    if (value === null || value === undefined || String(value).trim() === '') {
        return ''
    }

    return `<${tagName}>${escapeXml(value)}</${tagName}>`
}

function buildDetailLines(details: SaleDetailShape[] = []) {
    return details
        .map((detail, index) => {
            const lineNumber = Number(detail.lineNumber ?? index + 1) || index + 1
            const fullDescription = detail.description?.trim() || `Item ${lineNumber}`
            const description = truncate(fullDescription, 80)
            const extraDescription = fullDescription.length > 80 ? truncate(fullDescription.substring(80), 1000) : ''
            const quantity = Number(detail.quantity ?? 0) || 0
            const unitAmount = Number(detail.unitAmount ?? detail.amount ?? 0) || 0
            const lineAmount = Number(detail.amount ?? quantity * unitAmount) || 0

            return [
                '      <Detalle>',
                `        <NroLinDet>${lineNumber}</NroLinDet>`,
                detail.indExe ? `        <IndExe>${detail.indExe}</IndExe>` : '',
                `        <NmbItem>${escapeXml(description)}</NmbItem>`,
                extraDescription ? `        <DscItem>${escapeXml(extraDescription)}</DscItem>` : '',
                quantity > 0 ? `        <QtyItem>${quantity}</QtyItem>` : '',
                unitAmount > 0 ? `        <PrcItem>${unitAmount}</PrcItem>` : '',
                detail.discountPct ? `        <DescuentoPct>${detail.discountPct}</DescuentoPct>` : '',
                detail.discountAmount ? `        <DescuentoMonto>${integerAmount(detail.discountAmount)}</DescuentoMonto>` : '',
                `        <MontoItem>${integerAmount(lineAmount)}</MontoItem>`,
                '      </Detalle>',
            ]
            .filter(Boolean)
            .join('\n')
        })
        .join('\n')
}

function buildReferences(references: SaleReferenceShape[] = []) {
    return references
        .map((ref, index) => {
            const lineNumber = ref.lineNumber ?? index + 1
            return [
                '      <Referencia>',
                `        <NroLinRef>${lineNumber}</NroLinRef>`,
                ref.docType ? `        <TpoDocRef>${escapeXml(ref.docType)}</TpoDocRef>` : '',
                ref.folio ? `        <FolioRef>${escapeXml(ref.folio)}</FolioRef>` : '',
                ref.date ? `        <FchRef>${escapeXml(ref.date)}</FchRef>` : '',
                ref.code ? `        <CodRef>${escapeXml(String(ref.code))}</CodRef>` : '',
                ref.reason ? `        <RazonRef>${escapeXml(ref.reason)}</RazonRef>` : '',
                '      </Referencia>',
            ]
            .filter(Boolean)
            .join('\n')
        })
        .join('\n')
}

export default class SiiXmlBuilderService {
    public static buildDraftArtifacts(payload: DraftArtifactsPayload) {
        const issueDate = formatDate(payload.issuedAt, payload.sale.saleDate?.toISODate() ?? null)
        const business = payload.sale.business
        const client = payload.sale.client
        const detailXml = buildDetailLines(payload.sale.details ?? [])
        const tedArtifacts = TedService.buildTed({
            cafFile: payload.cafFile,
            sale: payload.sale,
            dteType: payload.dteType,
            folio: payload.folio,
            issueDate,
            issuerRut: payload.issuerRut,
            receiverRut: payload.receiverRut,
            totalAmount: payload.totalAmount,
            tedTimestamp: payload.issuedAt ?? DateTime.now().setZone('America/Santiago'),
        })

        const xmlUnsigned = [
            '<?xml version="1.0" encoding="ISO-8859-1"?>',
            '<DTE xmlns="http://www.sii.cl/SiiDte" version="1.0">',
            `  <Documento ID="SIGMI-T${payload.dteType}-F${payload.folio}">`,
            '    <Encabezado>',
            '      <IdDoc>',
            `        <TipoDTE>${payload.dteType}</TipoDTE>`,
            `        <Folio>${payload.folio}</Folio>`,
            `        <FchEmis>${issueDate}</FchEmis>`,
            '      </IdDoc>',
            '      <Emisor>',
            optionalTag('RUTEmisor', payload.issuerRut),
            optionalTag('RznSoc', business?.name ? truncate(business.name, 100) : null),
            optionalTag('GiroEmis', (business?.giro ?? business?.name) ? truncate(business?.giro ?? business?.name, 80) : null),
            `        <Acteco>${business?.acteco ?? 702000}</Acteco>`,
            optionalTag('DirOrigen', business?.address ? truncate(business.address, 70) : null),
            optionalTag('CmnaOrigen', (business?.municipality ?? business?.city) ? truncate(business?.municipality ?? business?.city, 20) : null),
            optionalTag('CiudadOrigen', business?.city ? truncate(business.city, 20) : null),
            '      </Emisor>',
            '      <Receptor>',
            optionalTag('RUTRecep', payload.receiverRut),
            optionalTag('RznSocRecep', client?.name ? truncate(client.name, 100) : null),
            optionalTag('GiroRecep', client?.giro ? truncate(client.giro, 40) : null),
            optionalTag('DirRecep', client?.address ? truncate(client.address, 70) : null),
            optionalTag('CmnaRecep', (client?.municipality ?? client?.city) ? truncate(client?.municipality ?? client?.city, 20) : 'SANTIAGO'),
            optionalTag('CiudadRecep', client?.city ? truncate(client.city, 20) : 'SANTIAGO'),
            '      </Receptor>',
            '      <Totales>',
            payload.netAmount > 0 ? `        <MntNeto>${integerAmount(payload.netAmount)}</MntNeto>` : '',
            payload.exemptAmount > 0 ? `        <MntExe>${integerAmount(payload.exemptAmount)}</MntExe>` : '',
            payload.taxAmount > 0 ? `        <TasaIVA>19</TasaIVA>` : '',
            payload.taxAmount > 0 ? `        <IVA>${integerAmount(payload.taxAmount)}</IVA>` : '',
            `        <MntTotal>${integerAmount(payload.totalAmount)}</MntTotal>`,
            '      </Totales>',
            '    </Encabezado>',
            detailXml,
            payload.globalDiscountPct ? [
                '      <DscRcgGlobal>',
                '        <NroLinDR>1</NroLinDR>',
                '        <TpoMov>D</TpoMov>',
                '        <GlosaDR>Descuento Global</GlosaDR>',
                '        <TpoValor>%</TpoValor>',
                `        <ValorDR>${payload.globalDiscountPct}</ValorDR>`,
                '        <IndExeDR>2</IndExeDR>',
                '      </DscRcgGlobal>'
            ].join('\n') : '',
            buildReferences(payload.sale.references ?? []),
            `    ${tedArtifacts.tedXml}`,
            `    <TmstFirma>${(payload.issuedAt ?? DateTime.now().setZone('America/Santiago')).toFormat("yyyy-LL-dd'T'HH:mm:ss")}</TmstFirma>`,
            '  </Documento>',
            '</DTE>',
        ]
            .filter(Boolean)
            .join('\n')

        return {
            xmlUnsigned,
            tedXml: tedArtifacts.tedXml,
            tedSignature: tedArtifacts.tedSignature,
        }
    }
}
