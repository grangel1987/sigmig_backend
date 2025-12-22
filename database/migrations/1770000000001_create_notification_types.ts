import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateNotificationTypes extends BaseSchema {
    async up() {
        if (!(await this.schema.hasTable('notification_types'))) {
            this.schema.createTable('notification_types', (table) => {
                table.increments('id').primary()
                table.string('name', 150).notNullable()
                table.string('code', 150).nullable().unique()
                table.text('description').nullable()
                table.boolean('enabled').notNullable().defaultTo(true)
                table.string('channel', 50).nullable() // optional: email, in_app, push
                table.string('severity', 50).nullable() // optional: info, warning, danger
                table.integer('created_by').notNullable()
                table.integer('updated_by').notNullable()
                table.timestamp('created_at', { useTz: true }).notNullable()
                table.timestamp('updated_at', { useTz: true }).notNullable()
            })
        }
    }

    async down() {
        this.schema.dropTable('notification_types')
    }
}
