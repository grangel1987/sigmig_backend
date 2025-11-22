import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreatePermissionsSystemTables extends BaseSchema {
    async up() {
        // Create permissions table
        if (!(await this.schema.hasTable('permissions'))) {
            this.schema.createTable('permissions', (table) => {
                table.increments('id').primary()
                table.string('key', 150).notNullable().unique()
                table.string('description', 150).notNullable()
                table.string('type', 150).nullable()
                table.timestamp('created_at', { useTz: true }).notNullable()
                table.timestamp('updated_at', { useTz: true }).notNullable()
            })
        }

        // Create rols table
        if (!(await this.schema.hasTable('rols'))) {
            this.schema.createTable('rols', (table) => {
                table.increments('id').primary()
                table.integer('business_id').nullable()
                table.string('name', 250).notNullable().defaultTo('')
                table.text('description').nullable()
                table.boolean('is_system').defaultTo(false)
                table.boolean('enabled').nullable()
                table.timestamp('created_at', { useTz: true }).notNullable()
                table.timestamp('updated_at', { useTz: true }).notNullable()
                table.integer('created_by').notNullable()
                table.integer('updated_by').notNullable()
            })
        }

        // Create rols_permissions junction table
        if (!(await this.schema.hasTable('rols_permissions'))) {
            this.schema.createTable('rols_permissions', (table) => {
                table.integer('rol_id').notNullable()
                table.integer('permission_id').notNullable()

                table.primary(['rol_id', 'permission_id'])
                table.foreign('rol_id')
                table.foreign('permission_id')
            })
        }
    }

    public async down() {
        this.schema.dropTable('rols_permissions')
        this.schema.dropTable('rols')
        this.schema.dropTable('permissions')
    }
}