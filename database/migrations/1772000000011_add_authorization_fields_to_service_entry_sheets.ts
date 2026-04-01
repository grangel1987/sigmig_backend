import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddAuthorizationFieldsToServiceEntrySheets extends BaseSchema {
  protected tableName = 'service_entry_sheets'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      const hasIsAuthorized = await this.schema.hasColumn(this.tableName, 'is_authorized')
      const hasAuthorizerId = await this.schema.hasColumn(this.tableName, 'authorizer_id')
      const hasAuthorizerAt = await this.schema.hasColumn(this.tableName, 'authorizer_at')

      this.schema.alterTable(this.tableName, (table) => {
        if (!hasIsAuthorized) {
          table.boolean('is_authorized').notNullable().defaultTo(false)
        }

        if (!hasAuthorizerId) {
          table.integer('authorizer_id').unsigned().nullable().references('id').inTable('users')
        }

        if (!hasAuthorizerAt) {
          table.timestamp('authorizer_at').nullable()
        }
      })
    }
  }

  public async down() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      const hasIsAuthorized = await this.schema.hasColumn(this.tableName, 'is_authorized')
      const hasAuthorizerId = await this.schema.hasColumn(this.tableName, 'authorizer_id')
      const hasAuthorizerAt = await this.schema.hasColumn(this.tableName, 'authorizer_at')

      this.schema.alterTable(this.tableName, (table) => {
        if (hasAuthorizerAt) {
          table.dropColumn('authorizer_at')
        }

        if (hasAuthorizerId) {
          table.dropColumn('authorizer_id')
        }

        if (hasIsAuthorized) {
          table.dropColumn('is_authorized')
        }
      })
    }
  }
}
