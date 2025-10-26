import User from '#models/users/user'; // Adjust path based on your project structure
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';

export default class SettingBookingProperty extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public name: string

    @column()
    public manyRooms: number

    @column()
    public description: string

    @column()
    public numberMaxPerson: number

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

    @column.dateTime()
    public expireDate: DateTime

    @column.dateTime()
    public deletedAt: DateTime | null

    @beforeCreate()
    public static async setEnabled(model: SettingBookingProperty) {
        model.enabled = true
    }

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    public static castDates(field: string, value: DateTime): string {
        if (field === 'expire_date') return value.toFormat('yyyy-MM-dd')
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}