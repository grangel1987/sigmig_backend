import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    async up() {
        if (!(await this.schema.hasTable('business_user_rols'))) {
            this.schema.createTable('business_user_rols', (table) => {
                table.increments('id').primary()
                table.integer('business_id').notNullable()
                table.bigInteger('user_id').unsigned().notNullable()
                table.string('rol', 100).notNullable()
                table.unique(['business_id', 'user_id'])
            })
        }

        if (!(await this.schema.hasTable('business_user_permissions'))) {
            this.schema.createTable('business_user_permissions', (table) => {
                table.increments('id').primary()
                table.integer('business_user_rol_id').unsigned().notNullable()
                table.string('permission', 255).notNullable()
            })
        }
    }

    async down() {
        this.schema.dropTable('business_user_permissions')
        this.schema.dropTable('business_user_rols')
    }
}