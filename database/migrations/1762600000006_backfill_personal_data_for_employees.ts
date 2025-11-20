import { BaseSchema } from '@adonisjs/lucid/schema';
import db from '@adonisjs/lucid/services/db';

/**
 * Backfill: create a personal_data record for every employee without one.
 * Copies identity-related fields from employees table with safe fallbacks.
 *
 * NOTE: Down migration is a NOOP to avoid destructive data removal.
 */
export default class BackfillPersonalDataForEmployees extends BaseSchema {
    public async up() {
        const trx = await db.transaction()
        try {
            const employees: Array<any> = await trx.from('employees').whereNull('personal_data_id')
            if (!employees.length) { await trx.commit(); return }

            const now = new Date()

            for (const emp of employees) {
                const names = emp.names || 'N/A'
                const lastNameP = emp.last_name_p || 'N/A'
                const lastNameM = emp.last_name_m || 'N/A'
                const typeIdentifyId = emp.identify_type_id || 0
                const identify = emp.identify || `EMP-${emp.id}`
                const stateCivilId = emp.state_civil_id || 0
                const sexId = emp.sex_id || 0
                // birth_date is NOT NULL; fallback to epoch baseline if absent
                const birthDate = emp.birth_date || new Date('1970-01-01')
                const nationalityId = emp.nationality_id || 0
                const cityId = emp.city_id || 0
                const address = emp.address || ''
                const phone = emp.phone || null
                const movil = emp.movil || ''
                const email = emp.email || null

                const insertQuery = trx.table('personal_data').insert({
                    names,
                    last_name_p: lastNameP,
                    last_name_m: lastNameM,
                    type_identify_id: typeIdentifyId,
                    identify,
                    state_civil_id: stateCivilId,
                    sex_id: sexId,
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
                    created_by: emp.created_by || emp.id,
                    updated_by: emp.updated_by || emp.id,
                    created_at: now,
                    updated_at: now,
                })

                let inserted: any
                try { inserted = await insertQuery.returning('id') } catch { inserted = await insertQuery }

                let personalDataId: number | undefined
                if (Array.isArray(inserted) && inserted.length) {
                    const first = inserted[0]
                    personalDataId = typeof first === 'number' ? first : first.id
                } else if (inserted && typeof inserted === 'object') {
                    personalDataId = inserted.id
                }
                if (!personalDataId) {
                    const last = await trx.from('personal_data').max('id as id').first()
                    if (last?.id) personalDataId = last.id
                }
                if (personalDataId) {
                    await trx.from('employees').where('id', emp.id).update({ personal_data_id: personalDataId })
                }
            }

            await trx.commit()
        } catch (error) {
            await trx.rollback()
            throw error
        }
    }

    public async down() {
        // NOOP - do not attempt to remove personal_data rows
    }
}
