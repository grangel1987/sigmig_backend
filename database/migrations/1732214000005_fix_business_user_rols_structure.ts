import { BaseSchema } from '@adonisjs/lucid/schema'

export default class FixBusinessUserRolsStructure extends BaseSchema {
    async up() {
        // Check current structure
        const hasOldStructure = await this.schema.hasColumn('business_user_rols', 'business_id')

        if (hasOldStructure) {
            // Drop and recreate with correct structure
            this.schema.dropTable('business_user_rols')

            this.schema.createTable('business_user_rols', (table) => {
                table.increments('id').primary()
                table.integer('business_user_id').notNullable()
                table.integer('rol_id').notNullable()
                table.boolean('signature').defaultTo(false)

                table.unique(['business_user_id', 'rol_id'])
            })
        } else {
            // Ensure correct structure
            this.schema.alterTable('business_user_rols', (table) => {
                table.boolean('signature').defaultTo(false).alter()
            })
        }
    }

    async down() {
        // No destructive down migration
    }
}