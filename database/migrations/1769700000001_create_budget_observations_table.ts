import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'budget_observations'

    public async up() {
        if (await this.schema.hasTable(this.tableName)) return

        this.schema.createTable(this.tableName, (table) => {
            table.increments('id').primary()
            table
                .integer('buget_id')
                .notNullable()
                .references('bugets.id')
                .onDelete('RESTRICT')

            table
                .integer('created_by_id').unsigned()
                .nullable()
                .references('business_users.id')
                .onDelete('RESTRICT')

            table.string('message').notNullable()
            table.boolean('from_client').notNullable().defaultTo(false)

            table.timestamp('created_at', { precision: 6, useTz: true }).notNullable()
            table.timestamp('updated_at', { precision: 6, useTz: true }).notNullable()
        })
    }

    public async down() {
        this.schema.dropTable(this.tableName)
    }
}
