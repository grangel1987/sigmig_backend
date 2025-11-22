import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    async up() {
        // Rename users table to users_old_temp as backup, if it exists
        if (await this.schema.hasTable('users')) {
            this.raw('RENAME TABLE users TO users_old_temp')
        }
    } async down() {
        // Restore users table if users_old_temp exists
        if (await this.schema.hasTable('users_old_temp')) {
            this.raw('RENAME TABLE users_old_temp TO users')
        }
    }
}