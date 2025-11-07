import Buget from '#models/bugets/buget'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BugetDetail extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'buget_id' })
    public bugetId: number

    @column({ columnName: 'cost_center' })
    public costCenter: string | null

    @column()
    public work: string | null

    @column()
    public observation: string | null

    /*     @column.dateTime({ autoCreate: true })
        public createdAt: DateTime
    
        @column.dateTime({ autoCreate: true, autoUpdate: true })
        public updatedAt: DateTime
     */
    @belongsTo(() => Buget, { foreignKey: 'bugetId' })
    public buget: BelongsTo<typeof Buget>
}
