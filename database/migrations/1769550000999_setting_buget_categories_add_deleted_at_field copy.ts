import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterEmployeePermitFileToText extends BaseSchema {
    protected tableName = 'setting_buget_categories'

    public async up() {

        const hasDeleted = await this.schema.hasColumn(this.tableName, 'deleted')
        const hasDeletedAt = await this.schema.hasColumn(this.tableName, 'deleted_at')


        if (hasDeleted && hasDeletedAt) return
        this.schema.alterTable(this.tableName, (table) => {
            if (!hasDeletedAt) {
                table.timestamp('deleted_at')
            }
            if (!hasDeleted) {
                table.boolean('deleted').defaultTo(0)
            }
        })
    }

    public async down() {
    }
}
