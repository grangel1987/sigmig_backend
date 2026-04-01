import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddAuthorizerFieldsToServiceEntrySheets extends BaseSchema {
    protected tableName = 'service_entry_sheets'

    public async up() {
        const tableExists = await this.schema.hasTable(this.tableName)
        if (!tableExists) return

        const hasAuthorizerId = await this.schema.hasColumn(this.tableName, 'authorizer_id')
        const hasIsAuthorized = await this.schema.hasColumn(this.tableName, 'is_authorized')
        const hasAuthorizerAt = await this.schema.hasColumn(this.tableName, 'authorizer_at')

        this.schema.alterTable(this.tableName, (table) => {
            if (!hasAuthorizerId) {
                table.bigInteger('authorizer_id').unsigned().nullable()
            }
            if (!hasIsAuthorized) {
                table.boolean('is_authorized').notNullable().defaultTo(false)
            }
            if (!hasAuthorizerAt) {
                table.timestamp('authorizer_at').nullable()
            }
        })

        if (!hasAuthorizerId) {
            this.schema.alterTable(this.tableName, (table) => {
                table.index(['authorizer_id'], 'service_entry_sheets_authorizer_id_idx')
            })
        }
    }

    public async down() {
        const tableExists = await this.schema.hasTable(this.tableName)
        if (!tableExists) return

        const hasAuthorizerId = await this.schema.hasColumn(this.tableName, 'authorizer_id')
        const hasIsAuthorized = await this.schema.hasColumn(this.tableName, 'is_authorized')
        const hasAuthorizerAt = await this.schema.hasColumn(this.tableName, 'authorizer_at')

        this.schema.alterTable(this.tableName, (table) => {
            if (hasAuthorizerId) {
                table.dropIndex(['authorizer_id'], 'service_entry_sheets_authorizer_id_idx')
                table.dropColumn('authorizer_id')
            }
            if (hasIsAuthorized) {
                table.dropColumn('is_authorized')
            }
            if (hasAuthorizerAt) {
                table.dropColumn('authorizer_at')
            }
        })
    }
}
