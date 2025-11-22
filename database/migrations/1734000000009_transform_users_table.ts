import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Check if personal_data table exists, create if not
    if (!(await this.schema.hasTable('personal_data'))) {
      this.schema.createTable('personal_data', (table) => {
        table.increments('id').primary()
        table.string('names', 100).notNullable()
        table.string('last_name_p', 100).notNullable()
        table.string('last_name_m', 100).notNullable()
        table.integer('type_identify_id').nullable()
        table.string('identify', 50).nullable()
        table.integer('state_civil_id').nullable()
        table.integer('sex_id').nullable()
        table.date('birth_date').nullable()
        table.integer('nationality_id').nullable()
        table.integer('city_id').nullable()
        table.text('address').nullable()
        table.string('phone', 20).nullable()
        table.string('movil', 20).nullable()
        table.string('email', 191).notNullable()
        table.string('photo', 250).nullable()
        table.string('thumb', 250).nullable()
        table.string('photo_short', 250).nullable()
        table.string('thumb_short', 250).nullable()
        table.integer('created_by').nullable()
        table.integer('updated_by').nullable()
        table.datetime('created_at').notNullable()
        table.datetime('updated_at').notNullable()
      })
    }

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

    // First, migrate personal data from old users table
    this.raw(`
            INSERT INTO personal_data (
                names, last_name_p, last_name_m, type_identify_id, identify,
                state_civil_id, sex_id, birth_date, nationality_id, city_id,
                address, phone, movil, email, photo, thumb, photo_short, thumb_short,
                created_by, updated_by, created_at, updated_at
            )
            SELECT
                names, last_name_p, last_name_m, type_identify_id, identify,
                state_civil_id, sex_id, birth_date, nationality_id, city_id,
                address, phone, movil, email, photo, thumb, photo_short, thumb_short,
                id as created_by, id as updated_by, created_at, updated_at
            FROM users_old_temp
            WHERE names IS NOT NULL OR last_name_p IS NOT NULL
        `)

    // Migrate compatible data from old table to new users table
    this.raw(`
            INSERT INTO users (
                id, personal_data_id, email, password, code, code_date_time,
                verified, enabled, created_at, updated_at, updated_by,
                verified_at, last_login_at, last_login_tz, is_admin, in_app,
                code_confirm, code_confirm_date_time, signature, signature_short,
                signature_thumb, signature_thumb_short, is_authorizer
            )
            SELECT
                u.id, pd.id as personal_data_id, u.email, u.password, u.code, u.code_date_time,
                u.verified, u.enabled, u.created_at, u.updated_at, u.updated_by,
                u.verified_at, u.last_login_at, u.last_login_tz, u.is_admin, u.in_app,
                u.code_confirm, u.code_confirm_date_time, u.url_signature, u.url_signature_short,
                NULL, NULL, COALESCE(u.is_authorizer, 0) as is_authorizer
            FROM users_old_temp u
            LEFT JOIN personal_data pd ON pd.email = u.email AND pd.created_by = u.id
        `)

    // Permanent backup
    await this.schema.renameTable('users_old_temp', 'users_old')
  }

  async down() {
    this.schema.dropTable('users')
    this.schema.dropTable('personal_data')
    await this.schema.renameTable('users_old', 'users')
  }
}