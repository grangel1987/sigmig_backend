import Product from '#models/products/product'
import Sale from '#models/sales/sale'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class SaleDetail extends BaseModel {
    public static table = 'sale_details'

    @column({ isPrimary: true })
    declare id: number

    @column({ columnName: 'sale_id' })
    declare saleId: number

    @column({ columnName: 'product_id' })
    declare productId: number | null

    @column({ columnName: 'line_number' })
    declare lineNumber: number | null

    @column()
    declare description: string | null

    @column({
        prepare: (value?: number) => value ?? null,
        consume: (value?: string | number) =>
            value === null || value === undefined ? 0 : Number(value),
    })
    declare quantity: number

    @column({
        columnName: 'unit_amount',
        prepare: (value?: number) => value ?? null,
        consume: (value?: string | number) =>
            value === null || value === undefined ? 0 : Number(value),
    })
    declare unitAmount: number

    @column({
        prepare: (value?: number) => value ?? null,
        consume: (value?: string | number) =>
            value === null || value === undefined ? 0 : Number(value),
    })
    declare amount: number

    @column({ columnName: 'metadata' })
    declare metadata: Record<string, unknown> | null

    @belongsTo(() => Sale, { foreignKey: 'saleId' })
    declare sale: BelongsTo<typeof Sale>

    @belongsTo(() => Product, { foreignKey: 'productId' })
    declare product: BelongsTo<typeof Product>

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime
}
