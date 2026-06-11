import Business from '#models/business/business'
import SiiDteDocument from '#models/sii/sii_dte_document'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class SiiCafFile extends BaseModel {
    public static table = 'sii_caf_files'

    @column({ isPrimary: true })
    declare id: number

    @column({ columnName: 'business_id' })
    declare businessId: number

    @belongsTo(() => Business, { foreignKey: 'businessId' })
    declare business: BelongsTo<typeof Business>

    @column({ columnName: 'dte_type' })
    declare dteType: number

    @column({
        columnName: 'range_start',
        prepare: (value?: number) => (value ?? null),
        consume: (value?: string | number) => (value === null || value === undefined ? 0 : Number(value)),
    })
    declare rangeStart: number

    @column({
        columnName: 'range_end',
        prepare: (value?: number) => (value ?? null),
        consume: (value?: string | number) => (value === null || value === undefined ? 0 : Number(value)),
    })
    declare rangeEnd: number

    @column({
        columnName: 'next_folio',
        prepare: (value?: number) => (value ?? null),
        consume: (value?: string | number) => (value === null || value === undefined ? 0 : Number(value)),
    })
    declare nextFolio: number

    @column.date({ columnName: 'issued_at' })
    declare issuedAt: DateTime | null

    @column()
    declare active: boolean

    @column({ columnName: 'encrypted_private_key_ref' })
    declare encryptedPrivateKeyRef: string | null

    @column({ columnName: 'raw_caf_xml' })
    declare rawCafXml: string | null

    @hasMany(() => SiiDteDocument, { foreignKey: 'cafFileId' })
    declare documents: HasMany<typeof SiiDteDocument>

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime
}
