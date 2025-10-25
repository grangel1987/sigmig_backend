import Coin from '#models/coin/coin'
import Country from '#models/countries/country'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class CountryCoin extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public countryId: number

  @column()
  public coinId: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @belongsTo(() => Country)
  public country: BelongsTo<typeof Country>

  @belongsTo(() => Coin)
  public coin: BelongsTo<typeof Coin>
}