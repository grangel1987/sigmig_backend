import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
    protected tableName = 'settings'

    public async up() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const exists = await db.from(this.tableName).where('text', 'ENVIO A FAENA').first()

        if (!exists) {
            await db.table(this.tableName).insert({
                country_id: 1,
                key_id: 9,
                text: 'ENVIO A FAENA',
                value: null,
                enabled: 1,
                created_by: 1,
                updated_by: 1,
                created_at: '2022-08-26 16:19:15',
                updated_at: '2022-08-26 16:19:15',
            })
        }
    }

    public async down() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        await db.from(this.tableName).where('id', 38).delete()
    }
}
