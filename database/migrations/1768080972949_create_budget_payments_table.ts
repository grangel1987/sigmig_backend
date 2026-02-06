import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateBudgetPaymentsTable extends BaseSchema {
  protected tableName = 'budget_payments'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (!tableExists) {
      this.schema.createTable(this.tableName, (table) => {
        table.increments('id')

        table.integer('budget_id').notNullable().references('bugets.id').onDelete('RESTRICT')

        table.timestamp('deleted_at').nullable()
        table.integer('deleted_by').unsigned().nullable()

        table.decimal('amount', 15, 2).notNullable()

        table.boolean('voided').notNullable().defaultTo(false)
        table.timestamp('voided_at')

        table.date('date').notNullable()

        table.timestamp('created_at')
        table.timestamp('updated_at')
      })
    }
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
