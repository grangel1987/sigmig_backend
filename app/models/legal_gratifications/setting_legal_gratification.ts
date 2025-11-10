import User from '#models/users/user'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class SettingLegalGratification extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public name: string

    @column({ serializeAs: null })
    public enabled: boolean

    @column({ columnName: 'created_by', serializeAs: null })
    public createdById: number

    @column({ columnName: 'updated_by', serializeAs: null })
    public updatedById: number

    @column.dateTime({ columnName: 'created_at', serializeAs: null })
    public createdAt: DateTime | null

    @column.dateTime({ columnName: 'updated_at', serializeAs: null })
    public updatedAt: DateTime | null

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    @beforeCreate()
    public static setEnabled(model: SettingLegalGratification) {
        model.enabled = true
    }
}
