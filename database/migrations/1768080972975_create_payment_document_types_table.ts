import { BaseSchema } from '@adonisjs/lucid/schema'

export default class DocumentTypesSchema extends BaseSchema {
  protected tableName = 'document_types'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (!tableExists) {
      this.schema.createTable(this.tableName, (table) => {
        table.increments('id')

        table.bigInteger('business_id').references('id').inTable('businesses').onDelete('RESTRICT')

        table.string('name').notNullable()

        table.timestamp('created_at')
        table.timestamp('updated_at')
      })
    }
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
