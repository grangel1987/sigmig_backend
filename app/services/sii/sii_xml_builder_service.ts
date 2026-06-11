import Sale from '#models/sales/sale'
import SiiCafFile from '#models/sii/sii_caf_file'
import TedService from '#services/sii/ted_service'
import { DateTime } from 'luxon'

type SaleRelationShape = {
    identify?: string | null
    name?: string | null
    address?: string | null
    giro?: string | null
}

type SaleDetailShape = {
    lineNumber?: number | null
    description?: string | null
    quantity?: number | null
    unitAmount?: number | null
    amount?: number | null
}

type SaleWithDteRelations = Sale & {
    business?: SaleRelationShape | null
    client?: SaleRelationShape | null
    details?: SaleDetailShape[] | null
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
}

function escapeXml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
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

    return DateTime.now().toFormat('yyyy-LL-dd')
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
            const description = detail.description?.trim() || `Item ${lineNumber}`
            const quantity = Number(detail.quantity ?? 0) || 0
            const unitAmount = Number(detail.unitAmount ?? detail.amount ?? 0) || 0
            const lineAmount = Number(detail.amount ?? quantity * unitAmount) || 0

            return [
                '      <Detalle>',
                `        <NroLinDet>${lineNumber}</NroLinDet>`,
                `        <NmbItem>${escapeXml(description)}</NmbItem>`,
                `        <QtyItem>${quantity}</QtyItem>`,
                `        <PrcItem>${integerAmount(unitAmount)}</PrcItem>`,
                `        <MontoItem>${integerAmount(lineAmount)}</MontoItem>`,
                '      </Detalle>',
            ].join('\n')
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
            tedTimestamp: payload.issuedAt ?? DateTime.now(),
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
            optionalTag('RznSoc', business?.name ?? null),
            optionalTag('GiroEmis', business?.giro ?? business?.name ?? null),
            optionalTag('DirOrigen', business?.address ?? null),
            '      </Emisor>',
            '      <Receptor>',
            optionalTag('RUTRecep', payload.receiverRut),
            optionalTag('RznSocRecep', client?.name ?? null),
            optionalTag('GiroRecep', client?.giro ?? null),
            optionalTag('DirRecep', client?.address ?? null),
            '      </Receptor>',
            '      <Totales>',
            `        <MntNeto>${integerAmount(payload.netAmount)}</MntNeto>`,
            payload.exemptAmount > 0 ? `        <MntExe>${integerAmount(payload.exemptAmount)}</MntExe>` : '',
            `        <IVA>${integerAmount(payload.taxAmount)}</IVA>`,
            `        <MntTotal>${integerAmount(payload.totalAmount)}</MntTotal>`,
            '      </Totales>',
            '    </Encabezado>',
            detailXml,
            `    ${tedArtifacts.tedXml}`,
            `    <TmstFirma>${(payload.issuedAt ?? DateTime.now()).toFormat("yyyy-LL-dd'T'HH:mm:ss")}</TmstFirma>`,
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