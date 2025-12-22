import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateNotificationUsers extends BaseSchema {
    async up() {
        if (!(await this.schema.hasTable('notification_users'))) {
            this.schema.createTable('notification_users', (table) => {
                table.increments('id').primary()
                table.integer('notification_id').notNullable()
                table.integer('business_user_id').notNullable()
                table.string('status', 20).notNullable().defaultTo('unread') // unread, read, archived
                table.timestamp('delivered_at', { useTz: true }).nullable()
                table.timestamp('read_at', { useTz: true }).nullable()
                table.timestamp('created_at', { useTz: true }).notNullable()
                table.index(['business_user_id', 'status'], 'nu_bu_status_idx')
            })
        }
    }

    async down() {
        this.schema.dropTable('notification_users')
    }
}
