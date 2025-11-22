import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddNumberMaxPersonToSettingBookingProperties extends BaseSchema {
    protected tableName = 'setting_booking_properties'

    public async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.integer('number_max_person').unsigned()
        })
    }

    public async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('number_max_person')
        })
    }
}
