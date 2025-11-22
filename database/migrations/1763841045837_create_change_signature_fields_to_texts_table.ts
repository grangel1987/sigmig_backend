import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.text('signature').alter()
      table.text('signature_thumb').alter()
    })
  }

  async down() {
    // Revert to VARCHAR if needed
    this.schema.alterTable('users', (table) => {
      table.string('signature', 250).alter()
      table.string('signature_thumb', 250).alter()
    })
  }
}