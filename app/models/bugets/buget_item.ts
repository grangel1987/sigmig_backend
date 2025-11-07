import Buget from '#models/bugets/buget'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BugetItem extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'buget_id' })
    public bugetId: number

    @column({ columnName: 'item_id' })
    public itemId: number

    @column({ columnName: 'with_title' })
    public withTitle: boolean

    @column()
    public title: string | null

    @column({ columnName: 'type_id' })
    public typeId: number

    @column()
    public value: string

    /*     @column.dateTime({ autoCreate: true })
        public createdAt: DateTime
    
        @column.dateTime({ autoCreate: true, autoUpdate: true })
        public updatedAt: DateTime
     */
    @belongsTo(() => Buget, { foreignKey: 'bugetId' })
    public buget: BelongsTo<typeof Buget>
}
