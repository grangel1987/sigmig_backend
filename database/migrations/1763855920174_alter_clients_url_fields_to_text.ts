import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterProductsUrlFieldsToText extends BaseSchema {
  async up() {
    this.schema.alterTable('clients', (table) => {
      table.text('url').alter()
      table.text('url_thumb').alter()
    })
  }

  async down() {
    // Note: This will revert to VARCHAR(255) which may cause data truncation
    // if URLs are longer than 255 characters
    this.schema.alterTable('clients', (table) => {
      table.string('url', 255).alter()
      table.string('url_thumb', 255).alter()
    })
  }
}