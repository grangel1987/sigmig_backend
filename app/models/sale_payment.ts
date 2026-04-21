import Coin from '#models/coin/coin'
import LedgerMovement from '#models/ledger_movement'
import Sale from '#models/sales/sale'
import { BaseModel, belongsTo, column, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class SalePayment extends BaseModel {
    public static table = 'sale_payments'

    @column({ isPrimary: true })
    declare id: number

    @column({ columnName: 'sale_id' })
    declare saleId: number

    @belongsTo(() => Sale, { foreignKey: 'saleId' })
    declare sale: BelongsTo<typeof Sale>

    @column({ columnName: 'coin_id' })
    declare coinId: number | null

    @belongsTo(() => Coin, { foreignKey: 'coinId' })
    declare coin: BelongsTo<typeof Coin>

    @column({
        prepare: (value?: number) => (value ?? null),
        consume: (value?: string | number) =>
            value === null || value === undefined ? 0 : Number(value),
    })
    declare amount: number

    @column()
    declare invoiced: boolean

    @column({ columnName: 'invoice_meta' })
    declare invoiceMeta: Record<string, unknown> | null

    @column.date()
    declare date: DateTime

    @column.date({ columnName: 'due_date' })
    declare dueDate: DateTime | null

    @column()
    declare voided: boolean

    @column.dateTime({ columnName: 'voided_at' })
    declare voidedAt: DateTime | null

    @column.dateTime({ columnName: 'deleted_at' })
    declare deletedAt: DateTime | null

    @column({ columnName: 'deleted_by' })
    declare deletedBy: number | null

    @hasOne(() => LedgerMovement, { foreignKey: 'salePaymentId' })
    declare ledgerMovement: HasOne<typeof LedgerMovement>

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime
}
