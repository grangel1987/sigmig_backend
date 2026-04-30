import { BaseSchema } from '@adonisjs/lucid/schema'

export default class SalesSchema extends BaseSchema {
    protected tableName = 'sales'

    public async up() {
        const tableExists = await this.schema.hasTable(this.tableName)

        if (!tableExists) {
            this.schema.createTable(this.tableName, (table) => {
                table.increments('id')

                table
                    .bigInteger('business_id')
                    .notNullable()
                    .references('id')
                    .inTable('businesses')
                    .onDelete('RESTRICT')

                table
                    .bigInteger('created_by')
                    .notNullable()
                    .references('id')
                    .inTable('users')
                    .onDelete('RESTRICT')

                table.string('title').nullable()
                table.text('description').nullable()
                table.date('sale_date').nullable()

                table.enum('status', ['draft', 'pending', 'confirmed', 'canceled']).defaultTo('draft')

                table.decimal('total_amount', 15, 2).nullable()
                // table.integer('currency_id').nullable()
                table.json('metadata').nullable()

                table.timestamp('created_at')
                table.timestamp('updated_at')

                table.index(['business_id'], 'sales_business_id_idx')
                table.index(['created_by'], 'sales_created_by_idx')
                table.index(['status'], 'sales_status_idx')
                table.index(['sale_date'], 'sales_sale_date_idx')
            })
        }
    }

    public async down() {
        this.schema.dropTable(this.tableName)
    }
}
