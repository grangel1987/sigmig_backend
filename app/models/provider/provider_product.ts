import User from '#models/users/user';
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import Provider from './provider.js';

export default class ProviderProduct extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public providerId: number

    @column()
    public code?: string

    @column()
    public name: string

    @column()
    declare price: number

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
    public static async setEnabled(model: ProviderProduct) {
        model.enabled = true
    }

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy!: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy!: BelongsTo<typeof User>

    @belongsTo(() => Provider, { foreignKey: 'providerId' })
    public provider!: BelongsTo<typeof Provider>

    public static castDates(_field: string, value: DateTime): string {
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}