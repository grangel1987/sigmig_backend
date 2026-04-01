import { BaseSchema } from '@adonisjs/lucid/schema'

export default class UnitTypesSchema extends BaseSchema {
  protected tableName = 'unit_types'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (!tableExists) {
      this.schema.createTable(this.tableName, (table) => {
        table.increments('id')
        table.string('name').notNullable()
        table.boolean('enabled').defaultTo(true)
        table.bigInteger('created_by').unsigned().notNullable()
        table.bigInteger('updated_by').unsigned().notNullable()
        table.timestamp('created_at')
        table.timestamp('updated_at')
      })
    }
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
