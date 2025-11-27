import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'permissions'

    async up() {
        this.schema.dropTableIfExists(this.tableName)
    }

    async down() {
        // This migration only drops the table, so down() is a no-op
        // The table will be recreated by the create_permissions_table migration
    }
}