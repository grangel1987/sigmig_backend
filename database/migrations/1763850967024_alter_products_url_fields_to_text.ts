import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterProductsUrlFieldsToText extends BaseSchema {
  async up() {
    this.schema.alterTable('products', (table) => {
      table.text('url').alter()
      table.text('url_thumb').alter()
    })
  }

  async down() {
    // Revert back to varchar - assuming they were varchar(255) originally
    this.schema.alterTable('products', (table) => {
      table.string('url', 255).alter()
      table.string('url_thumb', 255).alter()
    })
  }
}