import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class LedgingAccount extends BaseModel {
    public static table = 'ledging_accounts'

    @column({ isPrimary: true })
    public id: number

    @column()
    public businessId: number

    @column()
    public name: string

    @column()
    public type: 'income' | 'expense'

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime
}
