import XmlSignatureService from '#services/sii/xml_signature_service'
import env from '#start/env'
import { DateTime } from 'luxon'

interface BuildEnvelopePayload {
    signedDteXml: string
    dteType: number
    issuerRut: string
    setId?: string
    senderRut?: string | null
    receiverRut?: string | null
    resolutionDate?: string | null
    resolutionNumber?: number | null
    envelopeTimestamp?: DateTime | null
}

function escapeXml(value: unknown) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function stripXmlDeclaration(xml: string) {
    return xml.replace(/^\s*<\?xml[^>]*>\s*/i, '').trim()
}

function normalizeRut(value: string | null | undefined) {
    return String(value ?? '')
        .replace(/\./g, '')
        .trim()
        .toUpperCase()
}

function requireValue(value: unknown, fieldName: string) {
    const normalized = String(value ?? '').trim()
    if (!normalized) {
        throw new Error(`Missing required envelope field: ${fieldName}`)
    }

    return normalized
}

export default class SiiEnvelopeBuilderService {
    public static isConfigured() {
        return (
            XmlSignatureService.isConfigured() &&
            Boolean(env.get('DTE_ENVIO_RUT_ENVIA')) &&
            Boolean(env.get('DTE_ENVIO_RESOLUTION_DATE')) &&
            env.get('DTE_ENVIO_RESOLUTION_NUMBER') !== undefined
        )
    }

    public static buildSignedEnvelope(payload: BuildEnvelopePayload) {
        const setId = payload.setId ?? 'SetDoc'
        const senderRut = normalizeRut(payload.senderRut ?? env.get('DTE_ENVIO_RUT_ENVIA'))
        const receiverRut = normalizeRut(payload.receiverRut ?? env.get('DTE_ENVIO_RUT_RECEPTOR', '60803000-K'))
        const resolutionDate = requireValue(
            payload.resolutionDate ?? env.get('DTE_ENVIO_RESOLUTION_DATE'),
            'resolutionDate'
        )
        const resolutionNumber = Number(
            payload.resolutionNumber ?? env.get('DTE_ENVIO_RESOLUTION_NUMBER')
        )

        if (!Number.isFinite(resolutionNumber)) {
            throw new Error('Missing required envelope field: resolutionNumber')
        }

        const timestamp = (payload.envelopeTimestamp ?? DateTime.now()).toFormat("yyyy-LL-dd'T'HH:mm:ss")
        const dteXml = stripXmlDeclaration(payload.signedDteXml)

        const envelopeUnsigned = [
            '<?xml version="1.0" encoding="ISO-8859-1"?>',
            '<EnvioDTE xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sii.cl/SiiDte EnvioDTE_v10.xsd" version="1.0">',
            `  <SetDTE ID="${escapeXml(setId)}">`,
            '    <Caratula version="1.0">',
            `      <RutEmisor>${escapeXml(requireValue(normalizeRut(payload.issuerRut), 'issuerRut'))}</RutEmisor>`,
            `      <RutEnvia>${escapeXml(requireValue(senderRut, 'senderRut'))}</RutEnvia>`,
            `      <RutReceptor>${escapeXml(requireValue(receiverRut, 'receiverRut'))}</RutReceptor>`,
            `      <FchResol>${escapeXml(resolutionDate)}</FchResol>`,
            `      <NroResol>${Math.trunc(resolutionNumber)}</NroResol>`,
            `      <TmstFirmaEnv>${timestamp}</TmstFirmaEnv>`,
            '      <SubTotDTE>',
            `        <TpoDTE>${payload.dteType}</TpoDTE>`,
            '        <NroDTE>1</NroDTE>',
            '      </SubTotDTE>',
            '    </Caratula>',
            `    ${dteXml}`,
            '  </SetDTE>',
            '</EnvioDTE>',
        ].join('\n')

        const envelopeSigned = XmlSignatureService.signXml({
            xml: envelopeUnsigned,
            referenceXPath: "//*[local-name()='SetDTE']",
            signatureParentXPath: "//*[local-name()='EnvioDTE']",
            referenceUri: `#${setId}`,
        })

        return {
            envelopeUnsigned,
            envelopeSigned,
            setId,
            timestamp,
        }
    }
}