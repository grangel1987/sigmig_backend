import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CashAuditsSchema extends BaseSchema {
    protected tableName = 'cash_audits'

    public async up() {
        const exists = await this.schema.hasTable(this.tableName)
        if (!exists) {
            this.schema.createTable(this.tableName, (table) => {
                table.increments('id')
                table.bigInteger('business_id').notNullable().references('id').inTable('businesses').onDelete('RESTRICT')
                table.integer('performed_by')
                table.timestamp('performed_at', { useTz: true }).notNullable()
                table.decimal('total_counted', 15, 2).notNullable().defaultTo(0)
                table.decimal('total_expected', 15, 2).notNullable().defaultTo(0)
                table.decimal('difference', 15, 2).notNullable().defaultTo(0)
                table.text('notes').nullable()
                table.timestamp('created_at', { useTz: true })
                table.timestamp('updated_at', { useTz: true })
            })
        }
    }

    public async down() {
        this.schema.dropTable(this.tableName)
    }
}
