import CashAudit from '#models/cash_audits/cash_audit'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class CashAuditLine extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'cash_audit_id' })
    public cashAuditId: number

    @column()
    public type: 'income' | 'expense' | 'adjustment'

    @column()
    public description: string

    @column()
    public amount: number

    @column()
    public reference: string | null

    @column({ columnName: 'transaction_date' })
    public transactionDate: DateTime | null

    @column()
    public category: string | null

    @belongsTo(() => CashAudit, { foreignKey: 'cashAuditId' })
    public cashAudit: BelongsTo<typeof CashAudit>
}
