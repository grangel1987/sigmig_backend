import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'budget_payments'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('budget_edp_id').unsigned().references('id').inTable('budget_edps').onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('budget_edp_id')
    })
  }
}