import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Migrate data from old users table, if users_old_temp exists
    if (await this.schema.hasTable('users_old_temp')) {
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
      try {
        this.raw('RENAME TABLE users_old_temp TO users_old')
      } catch (error) {
        // Ignore if table doesn't exist
      }
    }
  }

  async down() {
    if (await this.schema.hasTable('users_old')) {
      this.raw('RENAME TABLE users_old TO users_old_temp')
    }
  }
}