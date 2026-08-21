import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'businesses'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('image')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('image').nullable()
    })
  }
}