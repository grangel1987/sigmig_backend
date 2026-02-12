import { BaseSchema } from '@adonisjs/lucid/schema'

export default class MakeServiceEntrySheetsClientIdNullable extends BaseSchema {
  protected tableName = 'service_entry_sheets'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      try {
        await this.schema.raw(
          'ALTER TABLE service_entry_sheets DROP FOREIGN KEY service_entry_sheets_client_id_foreign'
        )
      } catch {
        // Ignore if the foreign key does not exist
      }

      this.schema.alterTable(this.tableName, (table) => {
        table.bigInteger('client_id').unsigned().nullable().alter()
      })
    }
  }

  public async down() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      this.schema.alterTable(this.tableName, (table) => {
        table.bigInteger('client_id').unsigned().notNullable().alter()
      })
    }
  }
}
