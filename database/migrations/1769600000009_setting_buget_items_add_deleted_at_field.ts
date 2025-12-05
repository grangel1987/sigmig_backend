import { BaseSchema } from '@adonisjs/lucid/schema'

export default class SettingBugetItemsAddDeletedAtField extends BaseSchema {
    protected tableName = 'setting_buget_items'

    public async up() {
        const hasDeletedAt = await this.schema.hasColumn(this.tableName, 'deleted_at')

        if (hasDeletedAt) return

        this.schema.alterTable(this.tableName, (table) => {
            table.timestamp('deleted_at').nullable()
        })
    }

    public async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('deleted_at')
        })
    }
}