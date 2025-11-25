import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'employees'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('photo').alter()
      table.text('thumb').alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Revert back to VARCHAR (assuming they were VARCHAR before)
      table.string('photo').alter()
      table.string('thumb').alter()
    })
  }
}