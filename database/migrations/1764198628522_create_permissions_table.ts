import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'permissions'

  async up() {
    // Check if table exists, if not create it
    const tableExists = await this.schema.hasTable(this.tableName)

    if (!tableExists) {
      // Create the table if it doesn't exist
      this.schema.createTable(this.tableName, (table) => {
        table.increments('id')

        table.string('description').notNullable()

        table.string('key').notNullable()
        table.string('type').notNullable()
        table.string('name').notNullable()

        table.integer('module_id').references('id').inTable('modules').onDelete('RESTRICT')

        table.unique(['type', 'key'])

        table.timestamp('created_at')
        table.timestamp('updated_at')
      })
    } else {
      // Table exists, check which columns are missing
      const hasKey = await this.schema.hasColumn(this.tableName, 'key')
      const hasName = await this.schema.hasColumn(this.tableName, 'name')
      const hasDescription = await this.schema.hasColumn(this.tableName, 'description')
      const hasType = await this.schema.hasColumn(this.tableName, 'type')
      const hasModuleId = await this.schema.hasColumn(this.tableName, 'module_id')
      const hasCreatedAt = await this.schema.hasColumn(this.tableName, 'created_at')
      const hasUpdatedAt = await this.schema.hasColumn(this.tableName, 'updated_at')

      // Only alter table if there are missing columns
      if (!hasKey || !hasName || !hasDescription || !hasType || !hasModuleId || !hasCreatedAt || !hasUpdatedAt) {
        this.schema.alterTable(this.tableName, (table) => {
          if (!hasKey) {
            table.string('key').notNullable()
          } else {
            table.string('key').notNullable().alter()
          }

          if (!hasName) {
            table.string('name').notNullable()
          } else {
            table.string('name').notNullable().alter()
          }

          if (!hasDescription) {
            table.string('description').notNullable()
          } else {
            table.string('description').notNullable().alter()
          }

          if (!hasType) {
            table.string('type').notNullable()
          } else {
            table.string('type').notNullable().alter()
          }

          if (!hasModuleId) {
            table.integer('module_id').references('id').inTable('modules').onDelete('RESTRICT')
          }
          // Note: We don't alter foreign key columns as it can cause issues

          if (!hasCreatedAt) {
            table.timestamp('created_at')
          } else {
            table.timestamp('created_at').alter()
          }

          if (!hasUpdatedAt) {
            table.timestamp('updated_at')
          } else {
            table.timestamp('updated_at').alter()
          }

          // Note: Unique constraint will be added automatically when columns are created
        })
      }
    }
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}