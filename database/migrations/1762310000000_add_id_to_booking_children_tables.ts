import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddIdToBookingChildrenTables extends BaseSchema {
    protected tableGuests = 'booking_guests'
    protected tableItems = 'booking_items'
    protected tableFeedings = 'booking_feedings'
    protected tableNotes = 'booking_notes'
    protected tableProperties = 'booking_properties'

    public async up() {
        // Add auto-increment primary key to booking_guests
        this.schema.alterTable(this.tableGuests, (table) => {
            table.increments('id').primary().first()
        })

        // Add auto-increment primary key to booking_items
        this.schema.alterTable(this.tableItems, (table) => {
            table.increments('id').primary().first()
        })

        // Add auto-increment primary key to booking_feedings
        this.schema.alterTable(this.tableFeedings, (table) => {
            table.increments('id').primary().first()
        })

        // Add auto-increment primary key to booking_notes
        this.schema.alterTable(this.tableNotes, (table) => {
            table.increments('id').primary().first()
        })

        // Add auto-increment primary key to booking_properties
        this.schema.alterTable(this.tableProperties, (table) => {
            table.increments('id').primary().first()
        })
    }

    public async down() {
        // Drop id column from booking_guests
        this.schema.alterTable(this.tableGuests, (table) => {
            table.dropColumn('id')
        })

        // Drop id column from booking_items
        this.schema.alterTable(this.tableItems, (table) => {
            table.dropColumn('id')
        })

        // Drop id column from booking_feedings
        this.schema.alterTable(this.tableFeedings, (table) => {
            table.dropColumn('id')
        })

        // Drop id column from booking_notes
        this.schema.alterTable(this.tableNotes, (table) => {
            table.dropColumn('id')
        })

        // Drop id column from booking_properties
        this.schema.alterTable(this.tableProperties, (table) => {
            table.dropColumn('id')
        })
    }
}
