import Business from '#models/business/business'
import User from '#models/users/user'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class SettingBugetItem extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'type_id' })
    public typeId: number

    @column()
    public value: string

    @column({ columnName: 'with_title' })
    public withTitle: boolean

    @column()
    public title?: string | null

    // Stores a comma-separated list of category IDs (legacy compatibility)
    @column({ columnName: 'category_id' })
    public categoryIdsCsv: string

    @column()
    public enabled: boolean

    @column({ columnName: 'business_id' })
    public businessId?: number | null

    @column({ columnName: 'created_by' })
    public createdById: number

    @column({ columnName: 'updated_by' })
    public updatedById: number

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime

    @column.dateTime({ columnName: 'deleted_at' })
    public deletedAt: DateTime | null

    @beforeCreate()
    public static async setEnabled(model: SettingBugetItem) {
        model.enabled = true
    }

    /*     @belongsTo(() => Setting, { foreignKey: 'typeId' })
        public type: BelongsTo<typeof Setting> */

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    @belongsTo(() => Business, { foreignKey: 'businessId' })
    public business: BelongsTo<typeof Business>

    public static castDates(_field: string, value: DateTime): string {
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}
