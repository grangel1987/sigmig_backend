import User from '#models/users/user'; // Adjust path based on your project structure
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';

export default class SettingBookingItem extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public name: string

    @column()
    public isRoom: boolean

    @column()
    public isQuantity: boolean

    @column()
    public description: string

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

    @beforeCreate()
    public static async setEnabled(model: SettingBookingItem) {
        model.enabled = true
    }

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    public static castDates(field: string, value: DateTime): string {
        if (field === 'reset_password_at') return value.toFormat('yyyy-MM-dd HH:mm:ss')
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}