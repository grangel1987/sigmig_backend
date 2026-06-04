import SiiDteDocument from '#models/sii/sii_dte_document'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class SiiDteEvent extends BaseModel {
    public static table = 'sii_dte_events'

    @column({ isPrimary: true })
    declare id: number

    @column({ columnName: 'dte_document_id' })
    declare dteDocumentId: number

    @belongsTo(() => SiiDteDocument, { foreignKey: 'dteDocumentId' })
    declare document: BelongsTo<typeof SiiDteDocument>

    @column({ columnName: 'event_type' })
    declare eventType: string

    @column({
        columnName: 'payload_json',
        prepare: (value) => (value && typeof value === 'object' ? JSON.stringify(value) : value),
        consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
    })
    declare payloadJson: Record<string, unknown> | null

    @column.dateTime({ columnName: 'created_at', autoCreate: true })
    declare createdAt: DateTime
}
