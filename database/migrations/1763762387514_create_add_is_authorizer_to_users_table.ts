import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    const hasIsAuthorizer = await this.schema.hasColumn(this.tableName, 'is_authorizer')
    if (!hasIsAuthorizer) {
      this.schema.alterTable(this.tableName, (table) => {
        table.boolean('is_authorizer').defaultTo(false)
      })
    }
  }

  async down() {
    const hasIsAuthorizer = await this.schema.hasColumn(this.tableName, 'is_authorizer')
    if (hasIsAuthorizer) {
      this.schema.alterTable(this.tableName, (table) => {
        table.dropColumn('is_authorizer')
      })
    }
  }
}