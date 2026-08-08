import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'budget_edp_details'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.foreign('buget_product_id').references('id').inTable('buget_products').onDelete('cascade')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['buget_product_id'])
    })
  }
}