import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddProductIdAndUnitTypeToServiceEntryLines extends BaseSchema {
    protected tableName = 'service_entry_lines'

    public async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.bigInteger('product_id').unsigned().nullable()
            table.string('unit_type').nullable()
        })
    }

    public async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('product_id')
            table.dropColumn('unit_type')
        })
    }
}
