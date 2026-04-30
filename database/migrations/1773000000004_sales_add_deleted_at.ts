import { BaseSchema } from '@adonisjs/lucid/schema'

export default class SalesAddDeletedAt extends BaseSchema {
    protected tableName = 'sales'

    public async up() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'deleted_at')
        if (hasColumn) return

        this.schema.alterTable(this.tableName, (table) => {
            table.timestamp('deleted_at').nullable().after('updated_at')
            table.index(['deleted_at'], 'sales_deleted_at_idx')
        })
    }

    public async down() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'deleted_at')
        if (!hasColumn) return

        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(['deleted_at'], 'sales_deleted_at_idx')
            table.dropColumn('deleted_at')
        })
    }
}
