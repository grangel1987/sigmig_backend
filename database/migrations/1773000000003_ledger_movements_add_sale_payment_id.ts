import { BaseSchema } from '@adonisjs/lucid/schema'

export default class LedgerMovementsAddSalePaymentId extends BaseSchema {
    protected tableName = 'ledger_movements'

    public async up() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'sale_payment_id')
        if (hasColumn) return

        this.schema.alterTable(this.tableName, (table) => {
            table
                .integer('sale_payment_id')
                .unsigned()
                .nullable()
                .references('id')
                .inTable('sale_payments')
                .onDelete('RESTRICT')

            table.index(['sale_payment_id'], 'ledger_movements_sale_payment_id_idx')
        })
    }

    public async down() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'sale_payment_id')
        if (!hasColumn) return

        this.schema.alterTable(this.tableName, (table) => {
            table.dropIndex(['sale_payment_id'], 'ledger_movements_sale_payment_id_idx')
            table.dropColumn('sale_payment_id')
        })
    }
}
