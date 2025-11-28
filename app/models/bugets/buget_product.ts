import Buget from '#models/bugets/buget'
import Product from '#models/products/product'
import Util from '#utils/Util'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BugetProduct extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'buget_id' })
    public bugetId: number

    @column({ columnName: 'product_id' })
    public productId: number

    @column({ columnName: 'period_id' })
    public periodId: number | null

    @column()
    public name: string

    @column({ serialize: (value: number) => Util.truncateToTwoDecimals(value) })
    public amount: number

    @column()
    public count: number

    @column({ columnName: 'count_person' })
    public countPerson: number

    @column()
    public tax: number

    /* @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime */

    @belongsTo(() => Buget, { foreignKey: 'bugetId' })
    public buget: BelongsTo<typeof Buget>

    @belongsTo(() => Product, { foreignKey: 'productId' })
    public products: BelongsTo<typeof Product>
}
