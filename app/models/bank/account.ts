import Setting from '#models/settings/setting'; // Adjust path based on your project structure
import User from '#models/users/user'; // Adjust path based on your project structure
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';

export default class Account extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public bankId: number

    @column()
    public number: string

    @column()
    public owner: string

    @column()
    public typeIdentifyId: number

    @column()
    public typeAccountId: number

    @column()
    public identify: string

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

    @beforeCreate()
    public static async setEnabled(model: Account) {
        model.enabled = true
    }

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    @belongsTo(() => Setting, { foreignKey: 'bankId' })
    public bank: BelongsTo<typeof Setting>

    @belongsTo(() => Setting, { foreignKey: 'typeAccountId' })
    public typeAccount: BelongsTo<typeof Setting>

    @belongsTo(() => Setting, { foreignKey: 'typeIdentifyId' })
    public typeIdentify: BelongsTo<typeof Setting>

    public static castDates(_field: string, value: DateTime): string {
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}