import { BaseSchema } from '@adonisjs/lucid/schema'

export default class SaleDetailsSchema extends BaseSchema {
    protected tableName = 'sale_details'

    public async up() {
        const tableExists = await this.schema.hasTable(this.tableName)

        if (!tableExists) {
            this.schema.createTable(this.tableName, (table) => {
                table.increments('id')

                table
                    .integer('sale_id')
                    .unsigned()
                    .notNullable()
                    .references('id')
                    .inTable('sales')
                    .onDelete('CASCADE')

                table
                    .integer('product_id')
                    .nullable()
                    .references('id')
                    .inTable('products')
                    .onDelete('RESTRICT')

                table.string('description').nullable()
                table.integer('unit_id').unsigned().nullable().references('id').inTable('units').onDelete('RESTRICT')
                table.decimal('quantity', 15, 2).notNullable().defaultTo(1)
                table.decimal('amount', 15, 2).notNullable().defaultTo(0)

                table.json('metadata').nullable()

                table.timestamp('created_at')
                table.timestamp('updated_at')

            })
        }
    }

    public async down() {
        this.schema.dropTable(this.tableName)
    }
}
