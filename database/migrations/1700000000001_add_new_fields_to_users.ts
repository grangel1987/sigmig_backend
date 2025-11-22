import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    const db = this.db
    const hasColumn = async (table: string, column: string) => {
      const result = await db.rawQuery(`SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [table, column])
      return result[0].length > 0
    }

    const hasPersonalDataId = await hasColumn('users', 'personal_data_id')
    const hasSignature = await hasColumn('users', 'signature')
    const hasSignatureShort = await hasColumn('users', 'signature_short')
    const hasSignatureThumb = await hasColumn('users', 'signature_thumb')
    const hasSignatureThumbShort = await hasColumn('users', 'signature_thumb_short')
    const hasIsAuthorizer = await hasColumn('users', 'is_authorizer')

    // Create personal_data table if not exists
    const hasPersonalDataTable = await this.schema.hasTable('personal_data')
    if (hasPersonalDataTable) {
      this.schema.dropTable('personal_data')
    }
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

    // Migrate data to personal_data
    this.defer(async (db) => {
      await db.rawQuery(`
        INSERT INTO personal_data (
          names, last_name_p, last_name_m, type_identify_id, identify, state_civil_id, sex_id,
          birth_date, nationality_id, city_id, address, phone, movil, email,
          photo, thumb, photo_short, thumb_short,
          created_by, updated_by, created_at, updated_at
        )
        SELECT
          CASE
            WHEN LENGTH(full_name) - LENGTH(REPLACE(full_name, ' ', '')) = 0 THEN full_name
            WHEN LENGTH(full_name) - LENGTH(REPLACE(full_name, ' ', '')) = 1 THEN SUBSTRING_INDEX(full_name, ' ', 1)      
            ELSE SUBSTRING_INDEX(full_name, ' ', 1)
          END as names,
          CASE
            WHEN LENGTH(full_name) - LENGTH(REPLACE(full_name, ' ', '')) = 0 THEN ''
            WHEN LENGTH(full_name) - LENGTH(REPLACE(full_name, ' ', '')) = 1 THEN SUBSTRING_INDEX(full_name, ' ', -1)     
            ELSE SUBSTRING_INDEX(SUBSTRING_INDEX(full_name, ' ', 2), ' ', -1)
          END as last_name_p,
          CASE
            WHEN LENGTH(full_name) - LENGTH(REPLACE(full_name, ' ', '')) < 2 THEN ''
            ELSE SUBSTRING_INDEX(full_name, ' ', -1)
          END as last_name_m,
          type_identify_id, identify, NULL as state_civil_id, sex as sex_id,
          NULL as birth_date, NULL as nationality_id, NULL as city_id, NULL as address,
          phone, NULL as movil, email,
          url_avatar as photo, url_avatar_thumb as thumb,
          url as photo_short, url_short as thumb_short,
          id as created_by, updated_by, created_at, updated_at
        FROM users_old
        WHERE full_name IS NOT NULL AND full_name != ''
      `)
    })

    // Add new fields to users table
    this.schema.alterTable('users', (table) => {
      if (!hasPersonalDataId) table.integer('personal_data_id').nullable().unsigned().references('id').inTable('personal_data').onDelete('RESTRICT')
      if (!hasSignature) table.text('signature').nullable()
      if (!hasSignatureShort) table.string('signature_short', 250).nullable()
      if (!hasSignatureThumb) table.text('signature_thumb').nullable()
      if (!hasSignatureThumbShort) table.string('signature_thumb_short', 250).nullable()
      if (!hasIsAuthorizer) table.boolean('is_authorizer').defaultTo(false)
    })

    // Update new fields in users
    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE users
        SET signature = url_signature,
            signature_short = url_signature_short,
            signature_thumb = NULL,
            signature_thumb_short = NULL
      `)

      await db.rawQuery(`
        UPDATE users u
        SET personal_data_id = (
          SELECT pd.id FROM personal_data pd WHERE pd.email COLLATE utf8mb4_general_ci = u.email LIMIT 1
        )
      `)
    })
  }

  async down() {
    this.schema.dropTable('personal_data')
    this.schema.alterTable('users', (table) => {
      table.dropColumn('personal_data_id')
      table.dropColumn('signature')
      table.dropColumn('signature_short')
      table.dropColumn('signature_thumb')
      table.dropColumn('signature_thumb_short')
      table.dropColumn('is_authorizer')
    })
  }
}