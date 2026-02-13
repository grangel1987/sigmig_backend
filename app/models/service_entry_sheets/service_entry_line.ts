import ServiceEntrySheet from '#models/service_entry_sheets/service_entry_sheet'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class ServiceEntryLine extends BaseModel {
  public static table = 'service_entry_lines'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'service_entry_sheet_id' })
  public serviceEntrySheetId: number

  @column({ columnName: 'line_number' })
  public lineNumber: number | null

  @column({ columnName: 'service_code' })
  public serviceCode: string | null

  @column()
  public description: string | null

  @column({ columnName: 'planning_line' })
  public planningLine: string | null

  @column()
  public currency: string | null

  @column()
  public unit: string | null

  @column({
    columnName: 'unit_price',
    prepare: (value?: number) => value ?? null,
    consume: (value?: string | number) =>
      value === null || value === undefined ? 0 : Number(value),
  })
  public unitPrice: number

  @column({
    prepare: (value?: number) => value ?? null,
    consume: (value?: string | number) =>
      value === null || value === undefined ? 0 : Number(value),
  })
  public quantity: number

  @column({
    columnName: 'net_value',
    prepare: (value?: number) => value ?? null,
    consume: (value?: string | number) =>
      value === null || value === undefined ? 0 : Number(value),
  })
  public netValue: number

  @belongsTo(() => ServiceEntrySheet, { foreignKey: 'serviceEntrySheetId' })
  public serviceEntrySheet: BelongsTo<typeof ServiceEntrySheet>
}
