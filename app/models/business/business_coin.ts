import Coin from '#models/coin/coin'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BusinessCoin extends BaseModel {
  public static table = 'business_coins'

  @column({ isPrimary: true })
  public businessId: number

  @column({ isPrimary: true })
  public coinId: number

  @column()
  public isDefault: number

  @belongsTo(() => Coin, { foreignKey: 'coinId' })
  public coins: BelongsTo<typeof Coin>
}