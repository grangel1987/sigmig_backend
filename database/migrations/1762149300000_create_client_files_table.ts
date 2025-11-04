import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'client_files'

    async up() {
        if (!(await this.schema.hasTable(this.tableName)))
            this.schema.createTable(this.tableName, (table) => {
                table.increments()

                table
                    .integer('client_id')
                    .notNullable()
                    .references('id')
                    .inTable('clients')
                    .onDelete('RESTRICT')

                table.string('url').nullable()
                table.string('url_short').nullable()
                table.string('name').nullable()
                table.string('title').nullable()

                // Audit
                table
                    .integer('created_by')
                    .nullable()
                    .references('id')
                    .inTable('users')
                    .onDelete('RESTRICT')
                table
                    .integer('updated_by')
                    .nullable()
                    .references('id')
                    .inTable('users')
                    .onDelete('RESTRICT')

                // Timestamps
                table.timestamp('created_at', { precision: 6, useTz: true }).notNullable()
                table.timestamp('updated_at', { precision: 6, useTz: true }).notNullable()
            })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
