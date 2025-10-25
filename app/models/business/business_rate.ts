import Business from '#models/business/business'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BusinessRate extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public businessId: number

  @column()
  public rate: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @belongsTo(() => Business)
  public business: BelongsTo<typeof Business>
}