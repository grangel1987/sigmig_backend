import Sale from '#models/sales/sale'
import SiiCafFile from '#models/sii/sii_caf_file'
import { DateTime } from 'luxon'
import { createSign } from 'node:crypto'

type SaleRelationShape = {
    identify?: string | null
    name?: string | null
}

type SaleDetailShape = {
    description?: string | null
}

type SaleWithTedRelations = Sale & {
    business?: SaleRelationShape | null
    client?: SaleRelationShape | null
    details?: SaleDetailShape[] | null
}

interface BuildTedPayload {
    cafFile: SiiCafFile
    sale: SaleWithTedRelations
    dteType: number
    folio: number
    issueDate: string
    issuerRut?: string | null
    receiverRut?: string | null
    totalAmount: number
    tedTimestamp?: DateTime | null
}

function escapeXml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function normalizeRut(value: unknown) {
    return String(value ?? '')
        .replace(/\./g, '')
        .trim()
        .toUpperCase()
}

function requireValue(value: unknown, fieldName: string) {
    const normalized = String(value ?? '').trim()

    if (!normalized) {
        throw new Error(`Missing required TED field: ${fieldName}`)
    }

    return normalized
}

function compactXml(value: string) {
    return value.replace(/<\?xml[^>]*>/gi, '').replace(/>\s+</g, '><').trim()
}

function extractBlock(source: string, tagName: string) {
    const regex = new RegExp(`<${tagName}(?:\\s+[^>]*)?>[\\s\\S]*?<\\/${tagName}>`, 'i')
    const match = source.match(regex)
    return match ? compactXml(match[0]) : null
}

function extractPrivateKeyPem(...sources: Array<string | null | undefined>) {
    for (const source of sources) {
        if (!source) {
            continue
        }

        const match = source.match(
            /-----BEGIN(?: RSA)? PRIVATE KEY-----[\s\S]+?-----END(?: RSA)? PRIVATE KEY-----/
        )

        if (match) {
            return match[0].trim()
        }
    }

    return null
}

function buildDdXml(payload: BuildTedPayload, cafBlock: string, tedTimestamp: string) {
    const firstItem = payload.sale.details?.[0]?.description?.trim() || `Item ${payload.folio}`

    return [
        '<DD>',
        `<RE>${escapeXml(requireValue(normalizeRut(payload.issuerRut), 'issuerRut'))}</RE>`,
        `<TD>${payload.dteType}</TD>`,
        `<F>${payload.folio}</F>`,
        `<FE>${escapeXml(requireValue(payload.issueDate, 'issueDate'))}</FE>`,
        `<RR>${escapeXml(requireValue(normalizeRut(payload.receiverRut), 'receiverRut'))}</RR>`,
        `<RSR>${escapeXml(requireValue(payload.sale.client?.name, 'receiverName'))}</RSR>`,
        `<MNT>${Math.round(Number(payload.totalAmount) || 0)}</MNT>`,
        `<IT1>${escapeXml(firstItem)}</IT1>`,
        cafBlock,
        `<TSTED>${tedTimestamp}</TSTED>`,
        '</DD>',
    ].join('')
}

export default class TedService {
    public static buildTed(payload: BuildTedPayload) {
        if (!payload.cafFile.rawCafXml) {
            throw new Error('Active CAF is missing raw CAF XML')
        }

        const cafBlock = extractBlock(payload.cafFile.rawCafXml, 'CAF')
        if (!cafBlock) {
            throw new Error('Unable to extract CAF block from raw CAF XML')
        }

        const privateKeyPem = extractPrivateKeyPem(
            payload.cafFile.encryptedPrivateKeyRef,
            payload.cafFile.rawCafXml
        )
        if (!privateKeyPem) {
            throw new Error('CAF private key PEM is not available for TED signing')
        }

        const tedTimestamp = (payload.tedTimestamp ?? DateTime.now()).toFormat("yyyy-LL-dd'T'HH:mm:ss")
        const ddXml = buildDdXml(payload, cafBlock, tedTimestamp)
        const signer = createSign('RSA-SHA1')
        signer.update(ddXml, 'utf8')
        signer.end()

        const tedSignature = signer.sign(privateKeyPem, 'base64')
        const tedXml = `<TED version="1.0">${ddXml}<FRMT algoritmo="SHA1withRSA">${tedSignature}</FRMT></TED>`

        return {
            ddXml,
            tedXml,
            tedSignature,
        }
    }
}