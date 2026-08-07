import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateBudgetEdpDetailsTable extends BaseSchema {
  protected tableName = 'budget_edp_details'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (!tableExists) {
      this.schema.createTable(this.tableName, (table) => {
        table.increments('id')

        table
          .integer('budget_edp_id')
          .unsigned()
          .notNullable()
          .references('budget_edps.id')
          .onDelete('CASCADE')

        table
          .integer('buget_product_id')
          .unsigned()
          .notNullable()
          // .references('buget_products.id')
          // .onDelete('RESTRICT')

        table.decimal('percentage', 5, 4).notNullable()
        table.decimal('amount', 15, 2).notNullable()

        table.timestamp('created_at')
        table.timestamp('updated_at')

        table.index(['budget_edp_id'], 'budget_edp_details_edp_idx')
        table.index(['buget_product_id'], 'budget_edp_details_product_idx')
      })
    }
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
