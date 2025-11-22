import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    async up() {
        // Create users_old table with the old schema
        this.schema.createTable('users_old', (table) => {
            table.bigIncrements('id').primary()
            table.string('url', 250).nullable()
            table.string('url_short', 250).nullable()
            table.string('url_signature', 250).nullable()
            table.string('url_signature_short', 250).nullable()
            table.string('url_avatar', 250).nullable()
            table.string('url_avatar_thumb', 250).nullable()
            table.integer('type_identify_id').nullable()
            table.string('identify', 50).nullable()
            table.string('full_name', 200).notNullable()
            table.integer('sex').nullable()
            table.string('email', 191).notNullable()
            table.string('phone', 191).nullable()
            table.string('password', 191).notNullable()
            table.string('code', 191).nullable()
            table.datetime('code_date_time').nullable()
            table.integer('position_id').notNullable().defaultTo(0)
            table.boolean('verified').defaultTo(false)
            table.boolean('enabled').notNullable().defaultTo(false)
            table.datetime('created_at').notNullable()
            table.datetime('updated_at').notNullable()
            table.integer('updated_by').nullable()
            table.datetime('verified_at').nullable()
            table.datetime('last_login_at').nullable()
            table.string('last_login_tz', 100).nullable()
            table.string('reset_password', 250).nullable()
            table.datetime('reset_password_at').nullable()
            table.boolean('is_admin').nullable()
            table.boolean('in_app').defaultTo(false)
            table.integer('employee_id').nullable()
            table.integer('client_id').nullable()
            table.string('code_confirm', 50).nullable()
            table.datetime('code_confirm_date_time').nullable()
        })

        // Copy all data from users to users_old
        this.defer(async (db) => {
            await db.rawQuery('INSERT INTO users_old SELECT * FROM users')
        })
    }

    async down() {
        this.schema.dropTable('users_old')
    }
}