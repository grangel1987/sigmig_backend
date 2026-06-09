import { BaseSchema } from '@adonisjs/lucid/schema'

export default class SalesAddTokenField extends BaseSchema {
    protected tableName = 'sales'

    public async up() {
        const hasToken = await this.schema.hasColumn(this.tableName, 'token')

        if (hasToken) return

        this.schema.alterTable(this.tableName, (table) => {
            table.string('token', 24).nullable()
            table.index(['token'], 'sales_token_idx')
        })
    }

    public async down() {
        const hasToken = await this.schema.hasColumn(this.tableName, 'token')

        if (!hasToken) return

        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(['token'], 'sales_token_idx')
            table.dropColumn('token')
        })
    }
}