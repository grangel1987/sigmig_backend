import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddUserIdToEmployees extends BaseSchema {
    protected tableName = 'employees'

    public async up() {
        const exists = await this.schema.hasColumn(this.tableName, 'user_id')
        if (exists) return
        this.schema.alterTable(this.tableName, (table) => {
            table
                .bigInteger('user_id')
                .nullable()
                .references('id')
                .inTable('users')
                .onDelete('RESTRICT')
                .unique()
        })
    }

    public async down() {
        const exists = await this.schema.hasColumn(this.tableName, 'user_id')
        if (!exists) return
        this.schema.alterTable(this.tableName, (table) => {
            table.dropUnique(['user_id'])
            table.dropColumn('user_id')
        })
    }
}
