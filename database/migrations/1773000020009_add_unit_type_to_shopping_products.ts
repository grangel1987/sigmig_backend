import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'shopping_products'

    public async up() {
        const hasTable = await this.schema.hasTable(this.tableName)

        if (!hasTable) {
            return
        }

        const hasColumn = await this.schema.hasColumn(this.tableName, 'unit_type')

        if (hasColumn) {
            return
        }

        this.schema.alterTable(this.tableName, (table) => {
            table.string('unit_type').nullable()
        })
    }

    public async down() {
        const hasTable = await this.schema.hasTable(this.tableName)

        if (!hasTable) {
            return
        }

        const hasColumn = await this.schema.hasColumn(this.tableName, 'unit_type')

        if (!hasColumn) {
            return
        }

        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('unit_type')
        })
    }
}