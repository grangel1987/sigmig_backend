import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'budget_edps'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('token').nullable().unique()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('token')
    })
  }
}
