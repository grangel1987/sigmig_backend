import { BaseSchema } from '@adonisjs/lucid/schema'

export default class SalesAddDeletedAt extends BaseSchema {
    protected tableName = 'sale_details'

    public async up() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'line_number')
        if (hasColumn) return

        this.schema.alterTable(this.tableName, (table) => {
            table.integer('line_number').unsigned().nullable()
        })
    }

    public async down() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'line_number')
        if (!hasColumn) return

        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('line_number')
        })
    }
}
