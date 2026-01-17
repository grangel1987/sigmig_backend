import { BaseSchema } from '@adonisjs/lucid/schema'

export default class ExpensesSchema extends BaseSchema {
  protected tableName = 'expenses'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (!tableExists) {
      this.schema.createTable(this.tableName, (table) => {
        table.increments('id')
        table.bigInteger('business_id').notNullable().references('id').inTable('businesses').onDelete('RESTRICT')

        table.date('date').notNullable()

        table.decimal('amount', 15, 2).notNullable()
        table.integer('currency_id').notNullable()

        table.text('description').nullable()

        table.enum('status', ['paid', 'pending', 'canceled']).defaultTo('pending')

        table.timestamp('created_at')
        table.timestamp('updated_at')



        table.index(['date'], 'expenses_date_idx')
      })
    } else {
      // If table exists, no-op for now. Alterations can be handled later.
    }
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
