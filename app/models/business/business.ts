import BusinessCoin from '#models/business/business_coin'
import BusinessDelegate from '#models/business/business_delegate'
import BusinessRate from '#models/business/business_rate'
import BusinessUser from '#models/business/business_user'
import City from '#models/cities/City'
import Country from '#models/countries/country'
import TypeIdentify from '#models/settings/setting'
import User from '#models/users/user'
import { BaseModel, beforeCreate, belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Business extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public countryId: number

  @column()
  public cityId: number

  @column()
  public typeIdentifyId: number

  @column()
  public identify: string

  @column()
  public url: string | null

  @column()
  public urlShort: string | null

  @column()
  public urlThumb: string | null

  @column()
  public urlThumbShort: string | null

  @column()
  public name: string

  @column()
  public address: string

  @column()
  public phone: string

  @column()
  public email: string

  @column()
  public daysExpireBuget: number

  @column()
  public isUtility: boolean

  @column()
  public utility: number

  @column()
  public isDiscount: boolean

  @column()
  public discount: number

  @column()
  public image: string

  @column()
  public footer: string | null

  @column()
  public authorizationMinor: boolean | null

  @column()
  public emailConfirmInactiveEmployee: boolean | null

  @column()
  public enabled: boolean

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column({ columnName: 'created_by' })
  public createdById: number

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @column({ columnName: 'updated_by' })
  public updatedById: number

  @belongsTo(() => User)
  declare createdBy: BelongsTo<typeof User>

  @belongsTo(() => User)
  declare updatedBy: BelongsTo<typeof User>

  @belongsTo(() => Country)
  public country: BelongsTo<typeof Country>

  @belongsTo(() => City)
  public city: BelongsTo<typeof City>

  @belongsTo(() => TypeIdentify, { foreignKey: 'typeIdentifyId' })
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