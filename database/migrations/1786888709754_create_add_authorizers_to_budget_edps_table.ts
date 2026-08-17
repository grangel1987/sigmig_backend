import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'budget_edps'

  async up() {
    const hasAuthorizerId = await this.schema.hasColumn(this.tableName, 'authorizer_id')
    const hasAuthorizerAt = await this.schema.hasColumn(this.tableName, 'authorizer_at')
    const hasIsAuthorized = await this.schema.hasColumn(this.tableName, 'is_authorized')

    if (!hasAuthorizerId || !hasAuthorizerAt || !hasIsAuthorized) {
      this.schema.alterTable(this.tableName, (table) => {
        if (!hasAuthorizerId) table.integer('authorizer_id').unsigned().nullable()
        if (!hasAuthorizerAt) table.dateTime('authorizer_at').nullable()
        if (!hasIsAuthorized) table.boolean('is_authorized').defaultTo(false).notNullable()
      })
    }
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('authorizer_id')
      table.dropColumn('authorizer_at')
      table.dropColumn('is_authorized')
    })
  }
}