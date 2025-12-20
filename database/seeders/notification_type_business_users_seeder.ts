import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Database from '@adonisjs/lucid/services/db'

export default class extends BaseSeeder {
    public async run() {
        const trx = await Database.transaction()
        try {
            const types = await trx.from('notification_types').select('id')
            const supers = await trx.from('business_users').select('id').where('is_super', 1)

            const existing = await trx
                .from('notification_type_business_users')
                .select('notification_type_id', 'business_user_id')
            const existingPairs = new Set(existing.map((e: any) => `${e.notification_type_id}:${e.business_user_id}`))

            const now = new Date()
            const toInsert: Array<{ notification_type_id: number; business_user_id: number; created_at: Date }> = []

            for (const t of types) {
                for (const bu of supers) {
                    const key = `${t.id}:${bu.id}`
                    if (!existingPairs.has(key)) {
                        toInsert.push({ notification_type_id: t.id, business_user_id: bu.id, created_at: now })
                        existingPairs.add(key)
                    }
                }
            }

            if (toInsert.length) {
                // Insert in chunks to avoid large single statements
                const chunkSize = 1000
                for (let i = 0; i < toInsert.length; i += chunkSize) {
                    const chunk = toInsert.slice(i, i + chunkSize)
                    await trx.table('notification_type_business_users').insert(chunk)
                }
            }

            await trx.commit()
        } catch (error) {
            await trx.rollback()
            throw error
        }
    }
}
