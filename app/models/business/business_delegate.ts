import Business from '#models/business/business'
import TypeIdentify from '#models/settings/setting'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BusinessDelegate extends BaseModel {
  @column({ isPrimary: true })
  public businessId: number

  @column()
  public typeIdentifyId: number

  @column()
  public identify: string

  @column()
  public name: string

  @column()
  public phone: string

  @column()
  public email: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @column()
  public createdBy: number

  @column()
  public updatedBy: number

  @belongsTo(() => Business, {
    foreignKey: 'business_id',
  })
  public business: BelongsTo<typeof Business>

  @belongsTo(() => TypeIdentify, {
    foreignKey: 'type_identify_id',
  })
  public typeIdentify: BelongsTo<typeof TypeIdentify>

  public serialize() {
    const serialized = super.serialize()
    for (const field of ['created_at', 'updated_at']) {
      if (serialized[field]) {
        serialized[field] = DateTime.fromISO(serialized[field]).toFormat('dd/MM/yyyy hh:mm:ss a')
      }
    }
    return serialized
  }
}