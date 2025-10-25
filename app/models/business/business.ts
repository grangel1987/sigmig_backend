import BusinessCoin from '#models/business/business_coin'
import BusinessDelegate from '#models/business/business_delegate'
import BusinessRate from '#models/business/business_rate'
import BusinessUser from '#models/business/business_user'
import Country from '#models/countries/country'
import TypeIdentify from '#models/settings/setting'
import { BaseModel, beforeCreate, belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Business extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public country_id: number

  @column()
  public city_id: number

  @column()
  public type_identify_id: number

  @column()
  public identify: string

  @column()
  public url: string | null

  @column()
  public url_short: string | null

  @column()
  public url_thumb: string | null

  @column()
  public url_thumb_short: string | null

  @column()
  public name: string

  @column()
  public address: string

  @column()
  public phone: string

  @column()
  public email: string

  @column()
  public days_expire_buget: number

  @column()
  public is_utility: boolean

  @column()
  public utility: number

  @column()
  public is_discount: boolean

  @column()
  public discount: number

  @column()
  public image: string

  @column()
  public footer: string | null

  @column()
  public authorization_minor: boolean | null

  @column()
  public email_confirm_inactive_employee: boolean | null

  @column()
  public enabled: boolean

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column()
  public created_by: number

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime

  @column()
  public updated_by: number

  @belongsTo(() => Country)
  public country: BelongsTo<typeof Country>

  @belongsTo(() => TypeIdentify)
  public typeIdentify: BelongsTo<typeof TypeIdentify>

  @hasMany(() => BusinessCoin)
  public coins: HasMany<typeof BusinessCoin>

  @hasMany(() => BusinessRate)
  public rates: HasMany<typeof BusinessRate>

  @hasMany(() => BusinessUser)
  public users: HasMany<typeof BusinessUser>

  @hasOne(() => BusinessDelegate)
  public delegate: HasOne<typeof BusinessDelegate>

  @beforeCreate()
  public static async setEnabled(business: Business) {
    business.enabled = true
  }

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