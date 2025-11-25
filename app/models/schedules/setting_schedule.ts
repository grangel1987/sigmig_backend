import User from '#models/users/user'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class SettingSchedule extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'business_id' })
    public businessId: number

    @column()
    public name: string

    @column({ columnName: 'work_days' })
    public workDays: number

    @column({ columnName: 'days_off' })
    public daysOff: number

    @column()
    public events: string

    @column({ columnName: 'minutes_int' })
    public minutesInt: number

    @column({ columnName: 'minutes_out' })
    public minutesOut: number

    @column()
    public enabled: boolean

    @column({ columnName: 'created_by' })
    public createdById: number

    @column({ columnName: 'updated_by' })
    public updatedById: number

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    public static castDates(_field: string, value: DateTime) {
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}
