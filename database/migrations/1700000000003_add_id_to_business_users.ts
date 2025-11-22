import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    async up() {
        const hasId = await this.schema.hasColumn('business_users', 'id')
        if (!hasId) {
            this.schema.alterTable('business_users', (table) => {
                table.increments('id').primary()
            })
        }
    }

    async down() {
        // Optionally drop the id column, but risky
    }
}