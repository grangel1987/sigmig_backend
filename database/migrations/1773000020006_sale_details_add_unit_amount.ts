import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddUnitAmountToSaleDetails extends BaseSchema {
    protected tableName = 'sale_details'

    public async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.decimal('unit_amount', 15, 2).notNullable().defaultTo(0)
        })
    }

    public async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('unit_amount')
        })
    }
}