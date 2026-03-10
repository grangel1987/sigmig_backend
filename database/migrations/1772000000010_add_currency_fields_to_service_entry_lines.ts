import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddCurrencyFieldsToServiceEntryLines extends BaseSchema {
    protected tableName = 'service_entry_lines'

    public async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.integer('currency_id').unsigned().nullable()
            table.decimal('exchange_rate', 15, 6).nullable()
            table.index(['currency_id'], 'service_entry_lines_currency_id_idx')
        })
    }

    public async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(['currency_id'], 'service_entry_lines_currency_id_idx')
            table.dropColumn('exchange_rate')
            table.dropColumn('currency_id')
        })
    }
}
