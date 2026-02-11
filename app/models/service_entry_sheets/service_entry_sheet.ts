import BudgetPayment from '#models/budget_payment'
import Client from '#models/clients/client'
import ServiceEntryLine from '#models/service_entry_sheets/service_entry_line'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class ServiceEntrySheet extends BaseModel {
  public static table = 'service_entry_sheets'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'budget_payment_id' })
  public budgetPaymentId: number | null

  @column({ columnName: 'client_id' })
  public clientId: number | null

  @belongsTo(() => BudgetPayment, { foreignKey: 'budgetPaymentId' })
  public budgetPayment: BelongsTo<typeof BudgetPayment>

  @column()
  public direction: 'issued' | 'received' | null

  @column({ columnName: 'issuer_name' })
  public issuerName: string | null

  @column({ columnName: 'recipient_name' })
  public recipientName: string | null

  @column({ columnName: 'issuer_client_id' })
  public issuerClientId: number | null

  @column({ columnName: 'recipient_client_id' })
  public recipientClientId: number | null

  @belongsTo(() => Client, { foreignKey: 'issuerClientId' })
  public issuerClient: BelongsTo<typeof Client>

  @belongsTo(() => Client, { foreignKey: 'recipientClientId' })
  public recipientClient: BelongsTo<typeof Client>

  @belongsTo(() => Client, { foreignKey: 'clientId' })
  public client: BelongsTo<typeof Client>

  @column({ columnName: 'document_title' })
  public documentTitle: string | null

  @column({ columnName: 'note_to_invoice' })
  public noteToInvoice: string | null

  @column({ columnName: 'company_name' })
  public companyName: string | null

  @column({ columnName: 'company_address' })
  public companyAddress: string | null

  @column({ columnName: 'company_city' })
  public companyCity: string | null

  @column({ columnName: 'company_city_code' })
  public companyCityCode: string | null

  @column({ columnName: 'service_name' })
  public serviceName: string | null

  @column()
  public number: string

  @column.date({
    columnName: 'issue_date',
    serialize: (value: DateTime | null) =>
      value ? (typeof value === 'string' ? value : value.toFormat('yyyy-LL-dd')) : null,
  })
  public issueDate: DateTime

  @column({ columnName: 'purchase_order_number' })
  public purchaseOrderNumber: string | null

  @column({ columnName: 'purchase_order_position' })
  public purchaseOrderPosition: string | null

  @column.date({
    columnName: 'purchase_order_date',
    serialize: (value: DateTime | null) =>
      value ? (typeof value === 'string' ? value : value.toFormat('yyyy-LL-dd')) : null,
  })
  public purchaseOrderDate: DateTime | null

  @column({ columnName: 'vendor_number' })
  public vendorNumber: string | null

  @column()
  public currency: string | null

  @column({
    columnName: 'total_net_amount',
    prepare: (value?: number) => value ?? null,
    consume: (value?: string | number) =>
      value === null || value === undefined ? 0 : Number(value),
  })
  public totalNetAmount: number

  @hasMany(() => ServiceEntryLine, { foreignKey: 'serviceEntrySheetId' })
  public lines: HasMany<typeof ServiceEntryLine>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
