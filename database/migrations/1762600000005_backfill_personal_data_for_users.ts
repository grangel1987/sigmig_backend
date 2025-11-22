import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

/**
 * Backfill migration to create a personal_data row for each existing user
 * that currently has NULL personal_data_id. We copy user-centric identity
 * fields (if present) directly from the users table. If a field is missing
 * or null we apply a safe default.
 *
 * Assumptions:
 * - Legacy columns (names, last_name_p, last_name_m, identify, etc.) still
 *   exist on users table or are nullable. If they were never present this
 *   migration will simply create minimal placeholder records.
 * - personal_data table uses snake_case column names matching model mapping.
 * - Timestamps managed manually here for consistency.
 */
export default class BackfillPersonalDataForUsers extends BaseSchema {
    public async up() {
        const trx = await db.transaction()
        try {
            const users: Array<any> = await trx.from('users').whereNull('personal_data_id')

            if (!users.length) {
                await trx.commit()
                return
            }

            const now = new Date()

            for (const user of users) {
                // Extract with fallbacks
                const names = user.names || 'N/A'
                const lastNameP = user.last_name_p || 'N/A'
                const lastNameM = user.last_name_m || 'N/A'
                const typeIdentifyId = user.type_identify_id || 0
                const identify = user.identify || `USR-${user.id}`
                const stateCivilId = user.state_civil_id || 0
                const sexId = user.sex_id || 0
                // birth_date column appears to be NOT NULL in schema; provide a fallback when missing
                const birthDate = user.birth_date || new Date('1970-01-01')
                const nationalityId = user.nationality_id || 0
                const cityId = user.city_id || 0
                const address = user.address || ''
                const phone = user.phone || null
                const movil = user.movil || ''
                const email = user.email || null

                // Insert personal data
                const insertQuery = trx.table('personal_data').insert({
                    names,
                    last_name_p: lastNameP,
                    last_name_m: lastNameM,
                    type_identify_id: typeIdentifyId,
                    identify,
                    state_civil_id: stateCivilId,
                    sex_id: sexId,
                    // Ensure non-null date inserted
                    birth_date: birthDate,
                    nationality_id: nationalityId,
                    city_id: cityId,
                    address,
                    phone,
                    movil,
                    email,
                    photo: null,
                    thumb: null,
                    photo_short: null,
                    thumb_short: null,
                    created_by: user.id,
                    updated_by: user.id,
                    created_at: now,
                    updated_at: now,
                })
                let inserted: any
                // Attempt returning if supported
                try {
                    inserted = await insertQuery.returning('id')
                } catch {
                    inserted = await insertQuery
                }

                // Handle returning result shape (array vs object depending on dialect)
                let personalDataId: number | undefined
                if (Array.isArray(inserted)) {
                    // Postgres typically returns array of rows
                    if (inserted.length) {
                        const first = inserted[0]
                        personalDataId = typeof first === 'number' ? first : first.id
                    }
                } else if (inserted && typeof inserted === 'object') {
                    personalDataId = inserted.id
                }

                if (!personalDataId) {
                    // Fallback: try selecting last inserted id (may not work on all engines)
                    const last = await trx.from('personal_data').max('id as id').first()
                    if (last && last.id) personalDataId = last.id
                }

                if (personalDataId) {
                    await trx.from('users').where('id', user.id).update({ personal_data_id: personalDataId })
                }
            }

            await trx.commit()
        } catch (error) {
            await trx.rollback()
            throw error
        }
    }

    /**
     * Down migration: We leave inserted personal_data rows intact to avoid
     * accidental data loss. Optionally you could nullify the personal_data_id
     * for users that were updated, but without a reliable marker it's skipped.
     */
    public async down() {
        // Intentionally a noop to avoid destructive rollback
    }
}
