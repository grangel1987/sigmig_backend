import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateSalePaymentsTable extends BaseSchema {
    protected tableName = 'sale_payments'

    public async up() {
        const tableExists = await this.schema.hasTable(this.tableName)

        if (!tableExists) {
            this.schema.createTable(this.tableName, (table) => {
                table.increments('id')

                table.integer('sale_id').unsigned().notNullable().references('sales.id').onDelete('RESTRICT')

                table.integer('coin_id').nullable().references('coins.id').onDelete('RESTRICT')

                table.timestamp('deleted_at').nullable()
                table.integer('deleted_by').unsigned().nullable()

                table.decimal('amount', 15, 2).notNullable()

                table.boolean('invoiced').notNullable().defaultTo(false)
                table.json('invoice_meta').nullable()

                table.boolean('voided').notNullable().defaultTo(false)
                table.timestamp('voided_at').nullable()

                table.date('date').notNullable()
                table.date('due_date').nullable()

                table.timestamp('created_at')
                table.timestamp('updated_at')

                table.index(['sale_id'], 'sale_payments_sale_id_idx')
                table.index(['coin_id'], 'sale_payments_coin_id_idx')
                table.index(['date'], 'sale_payments_date_idx')
            })
        }
    }

    public async down() {
        this.schema.dropTable(this.tableName)
    }
}
