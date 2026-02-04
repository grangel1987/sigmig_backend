import { BaseSchema } from '@adonisjs/lucid/schema'

export default class PaymentDocumentTypesAddProjectionFields extends BaseSchema {
  protected tableName = 'document_types'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      const hasCode = await this.schema.hasColumn(this.tableName, 'code')
      const hasIsProjected = await this.schema.hasColumn(this.tableName, 'is_projected')

      if (!hasCode) {
        this.schema.alterTable(this.tableName, (table) => {
          table.string('code').nullable().index('document_types_code_idx')
        })
      }

      if (!hasIsProjected) {
        this.schema.alterTable(this.tableName, (table) => {
          table.boolean('is_projected').notNullable().defaultTo(false)
        })
      }
    }
  }

  public async down() {
    const tableExists = await this.schema.hasTable(this.tableName)
    if (tableExists) {
      const hasCode = await this.schema.hasColumn(this.tableName, 'code')
      const hasIsProjected = await this.schema.hasColumn(this.tableName, 'is_projected')

      if (hasCode || hasIsProjected) {
        this.schema.alterTable(this.tableName, (table) => {
          if (hasCode) table.dropColumn('code')
          if (hasIsProjected) table.dropColumn('is_projected')
        })
      }
    }
  }
}
