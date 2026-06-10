import { BaseSchema } from '@adonisjs/lucid/schema'

export default class SalesAddBillNumberField extends BaseSchema {
    protected tableName = 'sales'

    public async up() {
        const hasBillNumber = await this.schema.hasColumn(this.tableName, 'bill_number')

        if (hasBillNumber) return

        this.schema.alterTable(this.tableName, (table) => {
            table.string('bill_number').nullable()
        })
    }

    public async down() {
        const hasBillNumber = await this.schema.hasColumn(this.tableName, 'bill_number')

        if (!hasBillNumber) return

        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('bill_number')
        })
    }
}