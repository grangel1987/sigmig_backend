import { BaseSchema } from '@adonisjs/lucid/schema'

export default class SettingBugetItemsAddBusinessId extends BaseSchema {
    protected tableName = 'setting_buget_items'

    public async up() {
        const hasBusinessId = await this.schema.hasColumn(this.tableName, 'business_id')
        if (hasBusinessId) return

        this.schema.alterTable(this.tableName, (table) => {
            table.integer('business_id').unsigned().nullable()
            // Optionally add FK if businesses table exists
            // table.foreign('business_id').references('id').inTable('businesses').onDelete('SET NULL')
        })
    }

    public async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('business_id')
        })
    }
}
