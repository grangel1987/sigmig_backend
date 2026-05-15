import Business from '#models/business/business'
import Coin from '#models/coin/coin'
import SalePayment from '#models/sale_payment'
import SaleDetail from '#models/sales/sale_detail'
import User from '#models/users/user'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Sale extends BaseModel {
    public static table = 'sales'

    @column({ isPrimary: true })
    declare id: number

    @column({ columnName: 'business_id' })
    declare businessId: number

    @column({ columnName: 'created_by' })
    declare createdById: number

    @column()
    declare title: string | null

    @column()
    declare description: string | null

    @column.date({
        columnName: 'sale_date',
        serialize: (value: DateTime | null) =>
            value ? (typeof value === 'string' ? value : value.toFormat('yyyy-LL-dd')) : null,
    })
    declare saleDate: DateTime | null

    @column()
    declare status: 'draft' | 'pending' | 'confirmed' | 'canceled'

    @column({
        columnName: 'total_amount',
        prepare: (value?: number) => value ?? null,
        consume: (value?: string | number) =>
            value === null || value === undefined ? null : Number(value),
    })
    declare totalAmount: number | null

    @column({ columnName: 'currency_id' })
    declare currencyId: number | null

    @column({
        columnName: 'utility',
        prepare: (value?: number | null) => value ?? null,
        consume: (value?: string | number) =>
            value === null || value === undefined ? null : Number(value),
    })
    declare utility: number | null

    @column({ columnName: 'metadata' })
    declare metadata: Record<string, unknown> | null

    @belongsTo(() => Business, { foreignKey: 'businessId' })
    declare business: BelongsTo<typeof Business>

    @belongsTo(() => User, { foreignKey: 'createdById' })
    declare createdBy: BelongsTo<typeof User>

    @belongsTo(() => Coin, { foreignKey: 'currencyId' })
    declare currency: BelongsTo<typeof Coin>

    @hasMany(() => SaleDetail, { foreignKey: 'saleId' })
    declare details: HasMany<typeof SaleDetail>

    @hasMany(() => SalePayment, { foreignKey: 'saleId' })
    declare payments: HasMany<typeof SalePayment>

    @column.dateTime({ columnName: 'deleted_at' })
    declare deletedAt: DateTime | null

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime
}
