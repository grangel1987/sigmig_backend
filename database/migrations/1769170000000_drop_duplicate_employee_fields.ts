import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Drops legacy duplicated columns from employees that now live in personal_data.
 * Uses defensive existence checks so re-running or partial schema states won't fail.
 */
export default class DropDuplicateEmployeeFields extends BaseSchema {
    protected tableName = 'employees'

    private legacyColumns = [
        'identify_type_id',
        'identify',
        'names',
        'last_name_p',
        'last_name_m',
        'state_civil_id',
        'sex_id',
        'birth_date',
        'nationality_id',
        'city_id',
        'address',
        'phone',
        'movil',
        'email',
        'photo',
        'thumb',
        'photo_short',
        'thumb_short',
        'created_by',
        'updated_by',
    ]

    public async up() {
        const toDrop: string[] = []
        for (const col of this.legacyColumns) {
            const exists = await this.schema.hasColumn(this.tableName, col)
            if (exists) toDrop.push(col)
        }
        if (toDrop.length) {
            this.schema.alterTable(this.tableName, (table) => {
                toDrop.forEach((c) => table.dropColumn(c))
            })
        }
    }

    public async down() {
        const toCreate: string[] = []
        for (const col of this.legacyColumns) {
            const exists = await this.schema.hasColumn(this.tableName, col)
            if (!exists) toCreate.push(col)
        }
        if (toCreate.length) {
            this.schema.alterTable(this.tableName, (table) => {
                for (const col of toCreate) {
                    switch (col) {
                        case 'identify_type_id':
                            table.integer(col).notNullable()
                            break
                        case 'identify':
                            table.string(col, 250).notNullable()
                            break
                        case 'names':
                            table.string(col, 250).notNullable()
                            break
                        case 'last_name_p':
                            table.string(col, 250).notNullable()
                            break
                        case 'last_name_m':
                            table.string(col, 250).notNullable()
                            break
                        case 'state_civil_id':
                            table.integer(col).notNullable().defaultTo(0)
                            break
                        case 'sex_id':
                            table.integer(col).notNullable()
                            break
                        case 'birth_date':
                            table.date(col).notNullable()
                            break
                        case 'nationality_id':
                            table.integer(col).notNullable()
                            break
                        case 'city_id':
                            table.integer(col).notNullable()
                            break
                        case 'address':
                            table.text(col).notNullable()
                            break
                        case 'phone':
                            table.string(col, 250).nullable()
                            break
                        case 'movil':
                            table.string(col, 250).notNullable()
                            break
                        case 'email':
                            table.string(col, 250).notNullable()
                            break
                        case 'photo':
                            table.text(col).nullable()
                            break
                        case 'thumb':
                            table.text(col).nullable()
                            break
                        case 'photo_short':
                            table.string(col, 250).nullable()
                            break
                        case 'thumb_short':
                            table.string(col, 250).nullable()
                            break
                        case 'created_by':
                            table.integer(col).notNullable()
                            break
                        case 'updated_by':
                            table.integer(col).notNullable()
                            break
                        default:
                            break
                    }
                }
            })
        }
    }
}
