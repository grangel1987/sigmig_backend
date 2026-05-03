import { BaseSchema } from '@adonisjs/lucid/schema'

export default class SalesAddCurrencyId extends BaseSchema {
    protected tableName = 'sales'

    public async up() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'currency_id')
        if (hasColumn) return

        this.schema.alterTable(this.tableName, (table) => {
            table.integer('currency_id').unsigned().nullable().after('total_amount')
            table.index(['currency_id'], 'sales_currency_id_idx')
        })
    }

    public async down() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'currency_id')
        if (!hasColumn) return

        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(['currency_id'], 'sales_currency_id_idx')
            table.dropColumn('currency_id')
        })
    }
}
