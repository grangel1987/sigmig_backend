import User from '#models/users/user'
import { BaseModel, beforeCreate, beforeFetch, beforeFind, belongsTo, column } from '@adonisjs/lucid/orm'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class SettingBugetCategory extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public name: string

    @column()
    public enabled: boolean

    @column({ columnName: 'created_by' })
    public createdById: number

    @column.dateTime({ serializeAs: null })
    declare deletedAt: DateTime

    @column({ serializeAs: null })
    public deleted: boolean;

    @column({ columnName: 'updated_by' })
    public updatedById: number

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime

    @beforeCreate()
    public static async setEnabled(model: SettingBugetCategory) {
        model.enabled = true
    }

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    @beforeFind()
    @beforeFetch()
    public static hookName(query: ModelQueryBuilderContract<typeof SettingBugetCategory>) {
        query.where('deleted', false);
    }

    public static castDates(_field: string, value: DateTime): string {
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}
