import { BaseSchema } from '@adonisjs/lucid/schema'

export default class BugetsAddDeletedByField extends BaseSchema {
    protected tableName = 'bugets'

    public async up() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'deleted_by')
        if (hasColumn) return

        this.schema.alterTable(this.tableName, (table) => {
            table
                .integer('deleted_by')
                .nullable()
                .references('users.id')
                .onDelete('RESTRICT')
        })
    }

    public async down() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'deleted_by')
        if (!hasColumn) return

        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('deleted_by')
        })
    }
}
