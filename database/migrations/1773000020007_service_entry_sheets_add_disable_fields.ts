import { BaseSchema } from '@adonisjs/lucid/schema'

export default class ServiceEntrySheetsAddDisableFields extends BaseSchema {
    protected tableName = 'service_entry_sheets'

    public async up() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasEnabled = await this.schema.hasColumn(this.tableName, 'enabled')
        const hasDeletedAt = await this.schema.hasColumn(this.tableName, 'deleted_at')
        const hasDeletedBy = await this.schema.hasColumn(this.tableName, 'deleted_by')
        const hasUpdatedBy = await this.schema.hasColumn(this.tableName, 'updated_by')

        this.schema.alterTable(this.tableName, (table) => {
            if (!hasEnabled) {
                table.boolean('enabled').notNullable().defaultTo(true).after('is_authorized')
                table.index(['enabled'], 'service_entry_sheets_enabled_idx')
            }

            if (!hasDeletedAt) {
                table.timestamp('deleted_at').nullable().after('updated_at')
            }

            if (!hasDeletedBy) {
                table.bigInteger('deleted_by').unsigned().nullable().after('deleted_at')
            }

            if (!hasUpdatedBy) {
                table.bigInteger('updated_by').unsigned().nullable().after('updated_at')
            }
        })
    }

    public async down() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasEnabled = await this.schema.hasColumn(this.tableName, 'enabled')
        const hasDeletedAt = await this.schema.hasColumn(this.tableName, 'deleted_at')
        const hasDeletedBy = await this.schema.hasColumn(this.tableName, 'deleted_by')
        const hasUpdatedBy = await this.schema.hasColumn(this.tableName, 'updated_by')

        this.schema.alterTable(this.tableName, (table) => {
            if (hasEnabled) {
                table.dropIndex(['enabled'], 'service_entry_sheets_enabled_idx')
                table.dropColumn('enabled')
            }

            if (hasDeletedBy) {
                table.dropColumn('deleted_by')
            }

            if (hasDeletedAt) {
                table.dropColumn('deleted_at')
            }

            if (hasUpdatedBy) {
                table.dropColumn('updated_by')
            }
        })
    }
}
