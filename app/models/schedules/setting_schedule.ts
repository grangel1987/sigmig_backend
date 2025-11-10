import User from '#models/users/user'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
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
    public workDays: string | null

    @column({ columnName: 'days_off' })
    public daysOff: string | null

    @column()
    public events: string | null

    @column({ columnName: 'minutes_int' })
    public minutesInt: number | null

    @column({ columnName: 'minutes_out' })
    public minutesOut: number | null

    @column()
    public enabled: boolean

    @column({ columnName: 'created_by' })
    public createdById: number | null

    @column({ columnName: 'updated_by' })
    public updatedById: number | null

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime

    @beforeCreate()
    public static async setEnabled(model: SettingSchedule) {
        model.enabled = true
    }

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    public static castDates(_field: string, value: DateTime) {
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}
