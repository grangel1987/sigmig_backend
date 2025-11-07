import Account from '#models/bank/account'
import Buget from '#models/bugets/buget'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BugetAccount extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'buget_id' })
    public bugetId: number

    @column({ columnName: 'account_id' })
    public accountId: number

    /*     @column.dateTime({ autoCreate: true })
        public createdAt: DateTime
    
        @column.dateTime({ autoCreate: true, autoUpdate: true })
        public updatedAt: DateTime
     */
    @belongsTo(() => Buget, { foreignKey: 'bugetId' })
    public buget: BelongsTo<typeof Buget>

    @belongsTo(() => Account, { foreignKey: 'accountId' })
    public account: BelongsTo<typeof Account>
}
