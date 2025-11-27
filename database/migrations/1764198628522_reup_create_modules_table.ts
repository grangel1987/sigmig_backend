import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'modules'

  async up() {
    // Check if table exists, if not create it
    const tableExists = await this.schema.hasTable(this.tableName)

    if (!tableExists) {
      // Create the table if it doesn't exist
      this.schema.createTable(this.tableName, (table) => {
        table.increments('id')
        table.string('name').notNullable()
        table.string('description').notNullable()
        table.string('key').notNullable().unique()
        table.timestamp('created_at')
        table.timestamp('updated_at')
      })
    } else {
      // Table exists, check which columns are missing
      const hasName = await this.schema.hasColumn(this.tableName, 'name')
      const hasDescription = await this.schema.hasColumn(this.tableName, 'description')
      const hasKey = await this.schema.hasColumn(this.tableName, 'key')
      const hasCreatedAt = await this.schema.hasColumn(this.tableName, 'created_at')
      const hasUpdatedAt = await this.schema.hasColumn(this.tableName, 'updated_at')

      // Only alter table if there are missing columns or columns need modification
      if (!hasName || !hasDescription || !hasKey || !hasCreatedAt || !hasUpdatedAt) {
        this.schema.alterTable(this.tableName, (table) => {
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

          if (!hasKey) {
            table.string('key').notNullable().unique()
          } else {
            table.string('key').notNullable().unique().alter()
          }

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
        })
      }
    }
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}