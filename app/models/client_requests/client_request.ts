import Client from '#models/clients/client'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class ClientRequest extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public token: string

    @column({ columnName: 'client_id' })
    public clientId: number

    @column({ columnName: 'is_booking' })
    public isBooking: boolean

    @column()
    public enabled: boolean

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime

    @beforeCreate()
    public static setEnabled(model: ClientRequest) {
        model.enabled = true
    }

    @belongsTo(() => Client)
    public client: BelongsTo<typeof Client>

    public static castDates(_field: string, value: DateTime) {
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}
