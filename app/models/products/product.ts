import Setting from '#models/settings/setting';
import User from '#models/users/user';
import { BaseModel, beforeCreate, beforeFetch, beforeFind, belongsTo, column } from '@adonisjs/lucid/orm';
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';

export default class Product extends BaseModel {
    @column({ isPrimary: true })
    public id: number;

    @column()
    public businessId: number;

    @column()
    public typeId: number;

    @column()
    public name: string;

    @column()
    public count: number;

    @column()
    public amount: number;

    @column()
    public period?: number;

    @column()
    public periodCount?: number;

    @column()
    public url: string | null;

    @column()
    public urlShort: string | null;

    @column()
    public urlThumb: string | null;

    @column()
    public urlThumbShort: string | null;

    @column()
    public enabled: boolean = true;

    @column({ columnName: 'created_by' })
    public createdById: number;

    @column({ columnName: 'updated_by' })
    public updatedById: number;

    @column.dateTime({ serializeAs: null })
    declare deletedAt: DateTime

    @column({ serializeAs: null })
    public deleted: boolean;

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime;

    @beforeCreate()
    public static async setEnabled(model: Product) {
        model.enabled = true;
    }

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy!: BelongsTo<typeof User>;

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy!: BelongsTo<typeof User>;

    @belongsTo(() => Setting, { foreignKey: 'typeId' })
    public type!: BelongsTo<typeof Setting>;

    /**
     * Runs before finding a single record from the database
     */
    @beforeFind()
    @beforeFetch()
    public static hookName(query: ModelQueryBuilderContract<typeof Product>) {
        query.where('deleted', false);

    }


    public static castDates(_field: string, value: DateTime): string {
        return value.toFormat('dd/MM/yyyy hh:mm:ss a');
    }
}