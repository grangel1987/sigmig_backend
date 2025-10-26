import User from '#models/users/user'; // Adjust path based on your project structure
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Position extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'created_by' })
    public createdById: number

    @column({ columnName: 'updated_by' })
    public updatedById: number

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime

    @beforeCreate()
    public static async setEnabled(model: Position) {
        model.enabled = true
    }

    @column()
    public enabled: boolean

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    public static castDates(_field: string, value: DateTime): string {
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}