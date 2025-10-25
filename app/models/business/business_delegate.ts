import Business from '#models/business/business'
import TypeIdentify from '#models/settings/setting'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BusinessDelegate extends BaseModel {
  @column({ isPrimary: true })
  public business_id: number

  @column()
  public type_identify_id: number

  @column()
  public identify: string

  @column()
  public name: string

  @column()
  public phone: string

  @column()
  public email: string

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime

  @column()
  public created_by: number

  @column()
  public updated_by: number

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