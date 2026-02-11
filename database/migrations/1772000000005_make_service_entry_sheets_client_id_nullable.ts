import { BaseSchema } from '@adonisjs/lucid/schema'

export default class MakeServiceEntrySheetsClientIdNullable extends BaseSchema {
  protected tableName = 'service_entry_sheets'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      this.schema.alterTable(this.tableName, (table) => {
        table.bigInteger('client_id').nullable().alter()
      })
    }
  }

  public async down() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      this.schema.alterTable(this.tableName, (table) => {
        table.bigInteger('client_id').notNullable().alter()
      })
    }
  }
}
