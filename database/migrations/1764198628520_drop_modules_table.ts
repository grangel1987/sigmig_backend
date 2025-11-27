import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'modules'

    async up() {
        // Temporarily disable foreign key checks to allow dropping the table
        this.schema.raw('SET FOREIGN_KEY_CHECKS = 0')
        this.schema.dropTableIfExists(this.tableName)
        this.schema.raw('SET FOREIGN_KEY_CHECKS = 1')
    }

    async down() {
        // This migration only drops the table, so down() is a no-op
        // The table will be recreated by the create_modules_table migration
    }
}