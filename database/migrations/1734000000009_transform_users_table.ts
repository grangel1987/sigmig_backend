import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    async up() {
        // Backup old table
        await this.schema.renameTable('users', 'users_old_temp')

        // Create new users table
        this.schema.createTable('users', (table) => {
            table.bigIncrements('id').primary()
            table.integer('personal_data_id').nullable()
            table.string('email', 191).notNullable()
            table.string('password', 191).notNullable()
            table.string('code', 191).nullable()
            table.datetime('code_date_time').nullable()
            table.boolean('verified').defaultTo(false)
            table.boolean('enabled').defaultTo(false).notNullable()
            table.datetime('created_at').notNullable()
            table.datetime('updated_at').notNullable()
            table.integer('updated_by').nullable()
            table.datetime('verified_at').nullable()
            table.datetime('last_login_at').nullable()
            table.string('last_login_tz', 100).nullable()
            table.boolean('is_admin').nullable()
            table.boolean('in_app').defaultTo(false)
            table.string('code_confirm', 50).nullable()
            table.datetime('code_confirm_date_time').nullable()
            table.string('signature', 250).nullable()
            table.string('signature_short', 250).nullable()
            table.string('signature_thumb', 250).nullable()
            table.string('signature_thumb_short', 250).nullable()
            table.boolean('is_authorizer').defaultTo(false)
        })

        // Migrate compatible data from old table
        this.raw(`
      INSERT INTO users (
        id, personal_data_id, email, password, code, code_date_time,
        verified, enabled, created_at, updated_at, updated_by,
        verified_at, last_login_at, last_login_tz, is_admin, in_app,
        code_confirm, code_confirm_date_time, signature, signature_short,
        signature_thumb, signature_thumb_short, is_authorizer
      )
      SELECT 
        id, NULL as personal_data_id, email, password, code, code_date_time,
        verified, enabled, created_at, updated_at, updated_by,
        verified_at, last_login_at, last_login_tz, is_admin, in_app,
        code_confirm, code_confirm_date_time, url_signature, url_signature_short,
        NULL, NULL, 0 as is_authorizer
      FROM users_old_temp
    `)

        // Permanent backup
        await this.schema.renameTable('users_old_temp', 'users_old')
    }

    async down() {
        this.schema.dropTable('users')
        await this.schema.renameTable('users_old', 'users')
    }
}