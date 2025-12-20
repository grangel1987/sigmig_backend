import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateNotifications extends BaseSchema {
    async up() {
        if (!(await this.schema.hasTable('notifications'))) {
            this.schema.createTable('notifications', (table) => {
                table.increments('id').primary()
                table.integer('notification_type_id').nullable()
                table.integer('business_id').nullable()
                table.string('title', 250).notNullable()
                table.text('body').nullable()
                table.json('payload').nullable()
                table.integer('created_by').notNullable()
                table.timestamp('created_at', { useTz: true }).notNullable()
            })
        }
    }

    async down() {
        this.schema.dropTable('notifications')
    }
}
