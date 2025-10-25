import Coin from '#models/coin/coin'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BusinessCoin extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public business_id: number

  @column()
  public coin_id: number

  @column.dateTime({ serializeAs: null })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updated_at: DateTime

  @belongsTo(() => Coin)
  public coins: BelongsTo<typeof Coin>
}