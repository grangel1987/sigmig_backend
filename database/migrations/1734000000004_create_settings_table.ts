import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    async up() {
        if (!(await this.schema.hasTable('settings'))) {
            this.schema.createTable('settings', (table) => {
                table.increments('id').primary()
                table.integer('country_id').defaultTo(0)
                table.integer('key_id').notNullable()
                table.string('text', 50).notNullable()
                table.string('value', 50).nullable()
                table.boolean('enabled').notNullable().defaultTo(true)
                table.integer('created_by').defaultTo(0)
                table.integer('updated_by').defaultTo(0)
                table.timestamp('created_at', { useTz: true }).notNullable()
                table.timestamp('updated_at', { useTz: true }).notNullable()
            })
        }
    }
    async down() {
        if ((await this.schema.hasTable('settings')))
            this.schema.dropTable('settings')
    }
}