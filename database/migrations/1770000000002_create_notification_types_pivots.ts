import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateNotificationTypesPivots extends BaseSchema {
    async up() {
        if (!(await this.schema.hasTable('notification_type_business_users'))) {
            this.schema.createTable('notification_type_business_users', (table) => {
                table.increments('id').primary()
                table.integer('notification_type_id').notNullable()
                table.integer('business_user_id').notNullable()
                table.unique(['notification_type_id', 'business_user_id'], 'nt_bu_unique')
                table.timestamp('created_at', { useTz: true }).notNullable()
            })
        }

        if (!(await this.schema.hasTable('notification_type_rols'))) {
            this.schema.createTable('notification_type_rols', (table) => {
                table.increments('id').primary()
                table.integer('notification_type_id').notNullable()
                table.integer('rol_id').notNullable()
                table.unique(['notification_type_id', 'rol_id'], 'nt_rol_unique')
                table.timestamp('created_at', { useTz: true }).notNullable()
            })
        }
    }

    async down() {
        this.schema.dropTable('notification_type_rols')
        this.schema.dropTable('notification_type_business_users')
    }
}
