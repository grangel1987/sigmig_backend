import { BaseSchema } from '@adonisjs/lucid/schema'

export default class SalesAddServiceEntrySheetIdSchema extends BaseSchema {
    protected tableName = 'sales'

    public async up() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'service_entry_sheet_id')

        if (!hasColumn) {
            this.schema.alterTable(this.tableName, (table) => {
                table
                    .integer('service_entry_sheet_id')
                    .unsigned()
                    .nullable()
                    .references('id')
                    .inTable('service_entry_sheets')
                    .onDelete('SET NULL')
                table.index(['service_entry_sheet_id'], 'sales_service_entry_sheet_id_idx')
            })
        }
    }

    public async down() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'service_entry_sheet_id')
        if (!hasColumn) return

        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(['service_entry_sheet_id'], 'sales_service_entry_sheet_id_idx')
            table.dropColumn('service_entry_sheet_id')
        })
    }
}