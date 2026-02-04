import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateBudgetPaymentLinesTable extends BaseSchema {
  protected tableName = 'budget_payment_lines'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (!tableExists) {
      this.schema.createTable(this.tableName, (table) => {
        table.increments('id')

        table
          .integer('budget_payment_id')
          .unsigned()
          .notNullable()
          .references('budget_payments.id')
          .onDelete('CASCADE')

        table
          .integer('buget_product_id')
          .unsigned()
          .nullable()
          .references('buget_products.id')
          .onDelete('RESTRICT')

        table
          .integer('buget_item_id')
          .unsigned()
          .nullable()
          .references('buget_items.id')
          .onDelete('RESTRICT')

        table.decimal('amount', 15, 2).nullable()

        table.timestamp('created_at')
        table.timestamp('updated_at')

        table.index(['budget_payment_id'], 'budget_payment_lines_payment_idx')
        table.index(['buget_product_id'], 'budget_payment_lines_product_idx')
        table.index(['buget_item_id'], 'budget_payment_lines_item_idx')
      })
    }
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
