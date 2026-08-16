import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'budget_edps'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('authorizer_id').unsigned().nullable()
      table.dateTime('authorizer_at').nullable()
      table.boolean('is_authorized').defaultTo(false).notNullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('authorizer_id')
      table.dropColumn('authorizer_at')
      table.dropColumn('is_authorized')
    })
  }
}