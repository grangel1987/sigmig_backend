// 1762600000008_enhance_countries_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class EnhanceCountriesTable extends BaseSchema {
    protected tableName = 'countries'

    async up() {
        // Check if columns exist before adding them
        const hasCode = await this.schema.hasColumn(this.tableName, 'code')
        const hasFlag = await this.schema.hasColumn(this.tableName, 'flag')
        const hasPhoneCode = await this.schema.hasColumn(this.tableName, 'phone_code')

        this.schema.alterTable(this.tableName, (table) => {
            if (!hasCode) {
                table.string('code', 3).nullable()
            }
            if (!hasFlag) {
                table.string('flag', 10).nullable()
            }
            if (!hasPhoneCode) {
                table.string('phone_code', 10).nullable()
            }
        })

        // Update existing countries with default values
        this.defer(async (db) => {
            await db.rawQuery(`
        UPDATE countries SET 
          code = UPPER(SUBSTRING(name, 1, 2)),
          flag = '🏳️',
          phone_code = '+1'
        WHERE code IS NULL OR flag IS NULL OR phone_code IS NULL
      `)
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('code')
            table.dropColumn('flag')
            table.dropColumn('phone_code')
        })
    }
}