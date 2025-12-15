import { BaseSchema } from '@adonisjs/lucid/schema'

export default class BugetsAddDeletedAtField extends BaseSchema {
    protected tableName = 'bugets'

    public async up() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'deleted_at')
        if (hasColumn) return

        this.schema.alterTable(this.tableName, (table) => {
            table.timestamp('deleted_at').nullable()
        })
    }

    public async down() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'deleted_at')
        if (!hasColumn) return

        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('deleted_at')
        })
    }
}
