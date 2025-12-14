import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddStatusToBugets extends BaseSchema {
    protected tableName = 'bugets'

    public async up() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'status')
        if (hasColumn) return

        this.schema.alterTable(this.tableName, (table) => {
            table.enum('status', ['pending', 'revision', 'reject', 'accept']).nullable().after('enabled')
        })
    }

    public async down() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'status')
        if (!hasColumn) return

        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('status')
        })
    }
}
