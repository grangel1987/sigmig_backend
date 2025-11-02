import Setting from '#models/settings/setting'
import User from '#models/users/user'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class ClientContact extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'client_id' })
    public clientId: number

    @column({ columnName: 'identify_type_id' })
    public identifyTypeId: number | null

    @column({ columnName: 'client_contact_type_id' })
    public clientContactTypeId: number | null

    @column({ columnName: 'created_by' })
    public createdById: number | null

    @column({ columnName: 'updated_by' })
    public updatedById: number | null

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    @belongsTo(() => Setting, { foreignKey: 'identifyTypeId' })
    public typeIdentify: BelongsTo<typeof Setting>

    @belongsTo(() => Setting, { foreignKey: 'clientContactTypeId' })
    public typeContact: BelongsTo<typeof Setting>

    public static castDates(_field: string, value: DateTime) {
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}
