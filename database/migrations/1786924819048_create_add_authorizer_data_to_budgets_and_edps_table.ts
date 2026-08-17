import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('budget_edps', (table) => {
      table.json('authorizer_data').nullable()
    })
    this.schema.alterTable('bugets', (table) => {
      table.json('authorizer_data').nullable()
    })
  }

  async down() {
    this.schema.alterTable('budget_edps', (table) => {
      table.dropColumn('authorizer_data')
    })
    this.schema.alterTable('bugets', (table) => {
      table.dropColumn('authorizer_data')
    })
  }
}