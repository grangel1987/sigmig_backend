import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    async up() {
        // Remove old fields from users table
        this.schema.alterTable('users', (table) => {
            table.dropColumn('url')
            table.dropColumn('url_short')
            table.dropColumn('url_signature')
            table.dropColumn('url_signature_short')
            table.dropColumn('url_avatar')
            table.dropColumn('url_avatar_thumb')
            table.dropColumn('type_identify_id')
            table.dropColumn('identify')
            table.dropColumn('full_name')
            table.dropColumn('sex')
            table.dropColumn('phone')
            table.dropColumn('position_id')
            table.dropColumn('reset_password')
            table.dropColumn('reset_password_at')
            table.dropColumn('employee_id')
            table.dropColumn('client_id')
        })
    }

    async down() {
        // Add back old columns - this is complex, so no-op for safety
        console.warn('Down migration for remove_old_fields_from_users is a no-op to prevent data loss')
    }
}