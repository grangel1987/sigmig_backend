import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddTypeToUnitTypes extends BaseSchema {
  protected tableName = 'unit_types'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('type').nullable()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('type')
    })
  }
}
