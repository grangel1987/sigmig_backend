import Business from '#models/business/business'
import CashAuditLine from '#models/cash_audits/cash_audit_line'
import User from '#models/users/user'
import { BaseModel, beforeCreate, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class CashAudit extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'business_id' })
    public businessId: number

    @column()
    public date: DateTime

    @column()
    public status: 'open' | 'closed' | 'reconciled' | null

    @column({ columnName: 'opening_balance' })
    public openingBalance: number

    @column({ columnName: 'closing_balance' })
    public closingBalance: number | null

    @column({ columnName: 'expected_balance' })
    public expectedBalance: number | null

    @column()
    public difference: number | null

    @column()
    public notes: string | null

    @column()
    public enabled: boolean

    @column({ columnName: 'created_by' })
    public createdById: number

    @column({ columnName: 'updated_by' })
    public updatedById: number

    @column.dateTime({ autoCreate: true, serialize: (value: DateTime) => value?.toFormat('yyyy/LL/dd HH:mm:ss') })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true, serialize: (value: DateTime) => value?.toFormat('yyyy/LL/dd HH:mm:ss') })
    public updatedAt: DateTime

    @column.dateTime({ columnName: 'deleted_at', serialize: (value: DateTime | null) => value?.toFormat('yyyy/LL/dd HH:mm:ss') })
    public deletedAt: DateTime | null

    @column({ columnName: 'deleted_by' })
    public deletedById: number | null

    @beforeCreate()
    public static setDefaults(model: CashAudit) {
        if (model.enabled === undefined) model.enabled = true
        if (model.status === undefined) model.status = 'open'
    }

    @belongsTo(() => Business, { foreignKey: 'businessId' })
    public business: BelongsTo<typeof Business>

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'deletedById' })
    public deletedBy: BelongsTo<typeof User>

    @hasMany(() => CashAuditLine, { foreignKey: 'cashAuditId' })
    public lines: HasMany<typeof CashAuditLine>
}
