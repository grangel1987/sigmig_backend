import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import CashAuditLine from './cash_audit_line'

export default class CashAudit extends BaseModel {
    @column({ isPrimary: true })
    declare id: number

    @column()
    declare businessId: number | null

    @column()
    declare performedBy: number | null

    @column.dateTime()
    declare performedAt: DateTime

    @column()
    declare totalCounted: number

    @column()
    declare totalExpected: number

    @column()
    declare difference: number

    @column()
    declare notes: string | null

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @hasMany(() => CashAuditLine)
    declare lines: HasMany<typeof CashAuditLine>
}
