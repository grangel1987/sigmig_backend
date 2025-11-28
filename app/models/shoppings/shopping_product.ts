import Shopping from '#models/shoppings/shopping'
import Util from '#utils/Util'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class ShoppingProduct extends BaseModel {
    @column({ columnName: 'shopping_id' })
    public shoppingId: number

    @column({ columnName: 'product_id' })
    public productId: number

    @column()
    public code: string

    @column()
    public name: string

    @column({ serialize: (value: number) => Util.truncateToTwoDecimals(value) })
    public price: number

    @column({ columnName: 'count' })
    public count: number

    @column()
    public tax: number


    @belongsTo(() => Shopping, { foreignKey: 'shoppingId' })
    public shopping: BelongsTo<typeof Shopping>

}
