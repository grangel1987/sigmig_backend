import SiiAuthService from '#services/sii/sii_auth_service'
import SiiEnvelopeBuilderService from '#services/sii/sii_envelope_builder_service'
import SiiTransmissionService from '#services/sii/sii_transmission_service'
import env from '#start/env'

export default class SiiOrchestratorService {
  public static async sendDteDocument(
    signedDteXml: string,
    dteType: number,
    senderRutOverride?: string | null,
    receiverRutOverride?: string | null,
    companyRutOverride?: string | null
  ) {
    const senderRut = senderRutOverride ?? env.get('DTE_SENDER_RUT') ?? env.get('DTE_ENVIO_RUT_ENVIA')
    const companyRut = companyRutOverride ?? env.get('DTE_ENVIO_RUT_ENVIA')
    
    if (!senderRut) {
        throw new Error('Sender RUT (rutEnvia) is not configured or provided')
    }
    if (!companyRut) {
        throw new Error('Company RUT (rutEmisor) is not configured or provided')
    }

    // 1. Build the <EnvioDTE> envelope
    const { envelopeSigned: envioDteXml } = await SiiEnvelopeBuilderService.buildSignedEnvelope({
      signedDteXml,
      dteType,
      senderRut,
      issuerRut: companyRut,
      receiverRut: receiverRutOverride,
    })

    // 2. Authenticate with SII to get a token
    const token = await SiiAuthService.getToken()

    // 3. Send the EnvioDTE to SII
    const transmissionResult = await SiiTransmissionService.sendDte(
      envioDteXml,
      token,
      senderRut,
      companyRut
    )

    return {
      envioDteXml,
      trackId: transmissionResult.trackId,
      status: transmissionResult.status,
      rawResponse: transmissionResult.rawResponse,
    }
  }
}
