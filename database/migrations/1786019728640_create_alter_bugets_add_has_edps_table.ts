import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bugets'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('has_edp').defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('has_edp')
    })
  }
}