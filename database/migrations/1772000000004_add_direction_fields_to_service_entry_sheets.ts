import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddDirectionFieldsToServiceEntrySheets extends BaseSchema {
  protected tableName = 'service_entry_sheets'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      const hasDirection = await this.schema.hasColumn(this.tableName, 'direction')
      const hasIssuerName = await this.schema.hasColumn(this.tableName, 'issuer_name')
      const hasRecipientName = await this.schema.hasColumn(this.tableName, 'recipient_name')
      const hasIssuerClientId = await this.schema.hasColumn(this.tableName, 'issuer_client_id')
      const hasRecipientClientId = await this.schema.hasColumn(
        this.tableName,
        'recipient_client_id'
      )

      if (
        !hasDirection ||
        !hasIssuerName ||
        !hasRecipientName ||
        !hasIssuerClientId ||
        !hasRecipientClientId
      ) {
        this.schema.alterTable(this.tableName, (table) => {
          if (!hasDirection) {
            table
              .enu('direction', ['issued', 'received'], {
                useNative: true,
                enumName: 'service_entry_sheets_direction_enum',
              })
              .nullable()
          }

          if (!hasIssuerName) table.string('issuer_name').nullable()
          if (!hasRecipientName) table.string('recipient_name').nullable()

          if (!hasIssuerClientId) {
            table
              .bigInteger('issuer_client_id')
              .unsigned()
              .nullable()
          }

          if (!hasRecipientClientId) {
            table
              .bigInteger('recipient_client_id')
              .unsigned()
              .nullable()
          }
        })
      }

      if (!hasDirection) {
        this.schema.alterTable(this.tableName, (table) => {
          table.index(['direction'], 'service_entry_sheets_direction_idx')
        })
      }

      if (!hasIssuerClientId) {
        this.schema.alterTable(this.tableName, (table) => {
          table.index(['issuer_client_id'], 'service_entry_sheets_issuer_client_idx')
        })
      }

      if (!hasRecipientClientId) {
        this.schema.alterTable(this.tableName, (table) => {
          table.index(['recipient_client_id'], 'service_entry_sheets_recipient_client_idx')
        })
      }
    }
  }

  public async down() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      const hasDirection = await this.schema.hasColumn(this.tableName, 'direction')
      const hasIssuerName = await this.schema.hasColumn(this.tableName, 'issuer_name')
      const hasRecipientName = await this.schema.hasColumn(this.tableName, 'recipient_name')
      const hasIssuerClientId = await this.schema.hasColumn(this.tableName, 'issuer_client_id')
      const hasRecipientClientId = await this.schema.hasColumn(
        this.tableName,
        'recipient_client_id'
      )

      this.schema.alterTable(this.tableName, (table) => {
        if (hasDirection) table.dropIndex(['direction'], 'service_entry_sheets_direction_idx')
        if (hasIssuerClientId) {
          table.dropIndex(['issuer_client_id'], 'service_entry_sheets_issuer_client_idx')
        }
        if (hasRecipientClientId) {
          table.dropIndex(['recipient_client_id'], 'service_entry_sheets_recipient_client_idx')
        }

        if (hasRecipientClientId) table.dropColumn('recipient_client_id')
        if (hasIssuerClientId) table.dropColumn('issuer_client_id')
        if (hasRecipientName) table.dropColumn('recipient_name')
        if (hasIssuerName) table.dropColumn('issuer_name')
        if (hasDirection) table.dropColumn('direction')
      })

      try {
        await this.schema.raw('DROP TYPE IF EXISTS service_entry_sheets_direction_enum')
      } catch {
        // Ignore on dialects that do not support DROP TYPE
      }
    }
  }
}
