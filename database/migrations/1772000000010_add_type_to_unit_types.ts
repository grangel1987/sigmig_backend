import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddTypeToUnitTypes extends BaseSchema {
  protected tableName = 'unit_types'

  public async up() {
    if (!(await this.schema.hasColumn(this.tableName, 'type')))
      this.schema.alterTable(this.tableName, (table) => {
        table.string('type').nullable()
      })
  }

  public async down() {
    if (await this.schema.hasColumn(this.tableName, 'type'))

      this.schema.alterTable(this.tableName, (table) => {
        table.dropColumn('type')
      })
  }
}
