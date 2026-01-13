import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddMetaToNotifications extends BaseSchema {
    async up() {
        this.schema.alterTable('notifications', (table) => {
            table.json('meta').nullable()
        })
    }

    async down() {
        this.schema.alterTable('notifications', (table) => {
            table.dropColumn('meta')
        })
    }
}
