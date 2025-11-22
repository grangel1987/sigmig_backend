import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    async up() {
        const hasSchema = await this.schema.hasTable('adonis_schema')
        const hasSchemaVer = await this.schema.hasTable('adonis_schema_versions')
        const hasTk = await this.schema.hasTable('tokens')


        if (!hasSchema) {
            this.schema.createTable('adonis_schema', (table) => {
                table.increments('id').primary()
                table.string('name', 255).notNullable()
                table.integer('batch').notNullable()
                table.timestamp('migration_time', { useTz: true }).defaultTo(this.now())
            })
        }

        if (!hasSchemaVer) {
            this.schema.createTable('adonis_schema_versions', (table) => {
                table.integer('version').unsigned().primary()
            })
        }

        // tokens table (for classic refresh tokens, Ally, or sessions)
        if (!hasTk) {
            this.schema.createTable('tokens', (table) => {
                table.increments('id').primary()
                table.bigInteger('user_id').nullable().references('id').inTable('users').onDelete('CASCADE')
                table.string('token', 255).notNullable()
                table.string('type', 80).notNullable()
                table.boolean('is_revoked').defaultTo(false)
                table.datetime('created_at').nullable()
                table.datetime('updated_at').nullable()
                table.string('refreshToken', 255).nullable()
            })
        }
    }

    async down() {

    }
}