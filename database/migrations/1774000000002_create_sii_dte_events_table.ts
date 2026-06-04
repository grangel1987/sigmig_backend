import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateSiiDteEventsTable extends BaseSchema {
    protected tableName = 'sii_dte_events'

    public async up() {
        const tableExists = await this.schema.hasTable(this.tableName)

        if (!tableExists) {
            this.schema.createTable(this.tableName, (table) => {
                table.increments('id')

                table
                    .integer('dte_document_id')
                    .unsigned()
                    .notNullable()
                    .references('id')
                    .inTable('sii_dte_documents')
                    .onDelete('RESTRICT')

                table.string('event_type').notNullable()
                table.json('payload_json').nullable()
                table.timestamp('created_at').notNullable()

                table.index(['dte_document_id'], 'sii_dte_events_document_id_idx')
                table.index(['event_type'], 'sii_dte_events_event_type_idx')
                table.index(['created_at'], 'sii_dte_events_created_at_idx')
            })
        }
    }

    public async down() {
        this.schema.dropTable(this.tableName)
    }
}
