import City from '#models/cities/City';
import User from '#models/users/user';
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';

export default class Provider extends BaseModel {
    @column({ isPrimary: true })
    public id: number;

    @column()
    public name: string;

    @column()
    public address?: string;

    @column()
    public cityId?: number;

    @column()
    public phone?: string;

    @column()
    public email?: string;

    @column()
    public enabled: boolean;

    @column({ columnName: 'created_by' })
    public createdById: number;

    @column({ columnName: 'updated_by' })
    public updatedById: number;

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime;

    @beforeCreate()
    public static async setEnabled(model: Provider) {
        model.enabled = true;
    }

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy!: BelongsTo<typeof User>;

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy!: BelongsTo<typeof User>;

    @belongsTo(() => City, { foreignKey: 'cityId' })
    public city!: BelongsTo<typeof City>;

    public static castDates(_field: string, value: DateTime): string {
        return value.toFormat('dd/MM/yyyy hh:mm:ss a');
    }
}