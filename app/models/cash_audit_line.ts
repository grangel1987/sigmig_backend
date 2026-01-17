import CashAudit from '#models/cash_audit'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class CashAuditLine extends BaseModel {
    @column({ isPrimary: true })
    declare id: number

    @column()
    declare cashAuditId: number

    @column()
    declare kind: 'cash' | 'platform'

    @column()
    declare currencyId: number | null

    @column()
    declare denominationValue: number | null

    @column()
    declare quantity: number | null

    @column()
    declare platformName: string | null

    @column()
    declare amount: number | null

    @column()
    declare subtotal: number

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @belongsTo(() => CashAudit)
    declare audit: BelongsTo<typeof CashAudit>
}
