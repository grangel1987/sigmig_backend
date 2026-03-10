import { BaseSchema } from '@adonisjs/lucid/schema'
import Database from '@adonisjs/lucid/services/db'

export default class BackfillNotificationTypeBusinessUsersPerBusiness extends BaseSchema {
    public async up() {

        const trx = await Database.transaction()

        try {
            const types = await trx.from('notification_types').select('id')

            if (!types.length) {
                await trx.commit()
                return
            }

            const supers = await trx
                .from('business_users')
                .where('is_super', true)
                .select('id', 'business_id')

            console.log(`Processing ${supers.length} super business users`)

            if (!supers.length) {
                console.log('No super business users found, skipping backfill')
                await trx.commit()
                return
            }

            // Get existing pairs to avoid duplicates
            const existing = await trx
                .from('notification_type_business_users')
                .select('notification_type_id', 'business_user_id')

            const existingPairs = new Set(
                existing.map((e: any) => `${e.notification_type_id}:${e.business_user_id}`)
            )

            const now = new Date()
            const toInsert: Array<{
                notification_type_id: number
                business_user_id: number
                created_at: Date
            }> = []

            for (const type of types) {
                for (const user of supers) {
                    const key = `${type.id}:${user.id}`
                    if (!existingPairs.has(key)) {
                        toInsert.push({
                            notification_type_id: type.id,
                            business_user_id: user.id,
                            created_at: now,
                        })
                    }
                }
            }

            if (toInsert.length) {
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

    public async down() {
    }
}
