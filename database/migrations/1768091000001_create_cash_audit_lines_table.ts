import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CashAuditLinesSchema extends BaseSchema {
    protected tableName = 'cash_audit_lines'

    public async up() {
        const exists = await this.schema.hasTable(this.tableName)
        if (!exists) {
            this.schema.createTable(this.tableName, (table) => {
                table.increments('id')
                table
                    .integer('cash_audit_id')
                    .unsigned()
                    .references('cash_audits.id')
                    .onDelete('CASCADE')
                table.integer('currency_id').unsigned().nullable().references('coins.id').onDelete('RESTRICT')
                table.decimal('denomination_value', 15, 2).defaultTo(1)
                table.integer('quantity').unsigned().nullable()
                table.string('denomination_name').nullable()
                table.decimal('amount', 15, 2).nullable()
                table.decimal('subtotal', 15, 2).notNullable().defaultTo(0)
                table.timestamp('created_at', { useTz: true })
                table.timestamp('updated_at', { useTz: true })

                table.index(['cash_audit_id'], 'cash_audit_lines_audit_id_idx')
            })
        }
    }

    public async down() {
        this.schema.dropTable(this.tableName)
    }
}
