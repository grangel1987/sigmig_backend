import Business from '#models/business/business'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BusinessRate extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public business_id: number

  @column()
  public rate: number

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime

  @belongsTo(() => Business)
  public business: BelongsTo<typeof Business>
}