import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'budget_edps'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('approval_status').defaultTo('pending')
      table.text('client_observation').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('approval_status')
      table.dropColumn('client_observation')
    })
  }
}
