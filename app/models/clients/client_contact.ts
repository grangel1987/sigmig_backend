import Setting from '#models/settings/setting'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class ClientContact extends BaseModel {
    // No id PK in schema

    @column({ columnName: 'client_id', isPrimary: true })
    public clientId: number

    @column()
    public name: string

    @column()
    public phone: string

    @column()
    public email: string

    @column({ columnName: 'identify_type_id' })
    public identifyTypeId: number

    @column()
    public identify: string

    @column({ columnName: 'client_contact_type_id' })
    public clientContactTypeId: number

    @column.dateTime()
    public createdAt: DateTime

    @column.dateTime()
    public updatedAt: DateTime

    @column({ columnName: 'created_by' })
    public createdById: number

    @column({ columnName: 'updated_by' })
    public updatedById: number

    @belongsTo(() => Setting, { foreignKey: 'identifyTypeId' })
    public typeIdentify: BelongsTo<typeof Setting>

    @belongsTo(() => Setting, { foreignKey: 'clientContactTypeId' })
    public typeContact: BelongsTo<typeof Setting>

    // No user relations since only user IDs are present

    public static castDates(_field: string, value: DateTime) {
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}
