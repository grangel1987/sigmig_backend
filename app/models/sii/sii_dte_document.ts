import Business from '#models/business/business'
import Sale from '#models/sales/sale'
import SiiCafFile from '#models/sii/sii_caf_file'
import SiiDteEvent from '#models/sii/sii_dte_event'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export type SiiDteStatus =
    | 'draft'
    | 'signed'
    | 'sent'
    | 'accepted'
    | 'accepted_with_reparo'
    | 'rejected'
    | 'canceled'
    | 'error'

export default class SiiDteDocument extends BaseModel {
    public static table = 'sii_dte_documents'

    @column({ isPrimary: true })
    declare id: number

    @column({ columnName: 'sale_id' })
    declare saleId: number

    @belongsTo(() => Sale, { foreignKey: 'saleId' })
    declare sale: BelongsTo<typeof Sale>

    @column({ columnName: 'business_id' })
    declare businessId: number

    @belongsTo(() => Business, { foreignKey: 'businessId' })
    declare business: BelongsTo<typeof Business>

    @column({ columnName: 'caf_file_id' })
    declare cafFileId: number | null

    @belongsTo(() => SiiCafFile, { foreignKey: 'cafFileId' })
    declare cafFile: BelongsTo<typeof SiiCafFile>

    @column({ columnName: 'dte_type' })
    declare dteType: number

    @column({
        prepare: (value?: number) => (value ?? null),
        consume: (value?: string | number) => (value === null || value === undefined ? 0 : Number(value)),
    })
    declare folio: number

    @column()
    declare status: SiiDteStatus

    @column({ columnName: 'sii_track_id' })
    declare siiTrackId: string | null

    @column({ columnName: 'issuer_rut' })
    declare issuerRut: string | null

    @column({ columnName: 'receiver_rut' })
    declare receiverRut: string | null

    @column.dateTime({ columnName: 'issued_at' })
    declare issuedAt: DateTime | null

    @column({
        columnName: 'net_amount',
        prepare: (value?: number) => value ?? 0,
        consume: (value?: string | number) => (value === null || value === undefined ? 0 : Number(value)),
    })
    declare netAmount: number

    @column({
        columnName: 'tax_amount',
        prepare: (value?: number) => value ?? 0,
        consume: (value?: string | number) => (value === null || value === undefined ? 0 : Number(value)),
    })
    declare taxAmount: number

    @column({
        columnName: 'exempt_amount',
        prepare: (value?: number) => value ?? 0,
        consume: (value?: string | number) => (value === null || value === undefined ? 0 : Number(value)),
    })
    declare exemptAmount: number

    @column({
        columnName: 'total_amount',
        prepare: (value?: number) => value ?? 0,
        consume: (value?: string | number) => (value === null || value === undefined ? 0 : Number(value)),
    })
    declare totalAmount: number

    @column({ columnName: 'xml_unsigned' })
    declare xmlUnsigned: string | null

    @column({ columnName: 'xml_signed' })
    declare xmlSigned: string | null

    @column({ columnName: 'ted_xml' })
    declare tedXml: string | null

    @column({ columnName: 'ted_signature' })
    declare tedSignature: string | null

    @column({ columnName: 'pdf_url' })
    declare pdfUrl: string | null

    @column({ columnName: 'xml_url' })
    declare xmlUrl: string | null

    @column({ columnName: 'last_error' })
    declare lastError: string | null

    @hasMany(() => SiiDteEvent, { foreignKey: 'dteDocumentId' })
    declare events: HasMany<typeof SiiDteEvent>

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime
}
