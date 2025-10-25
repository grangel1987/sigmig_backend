// import BusinessUser from '#models/business_user'
// import PersonalData from '#models/personal_data'
import Token from '#models/users/token'
import Util from '#utils/Util'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Hash from '@adonisjs/core/services/hash'

import BusinessUser from '#models/business/business_user'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, beforeCreate, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import PersonalData from './personal_data.js'

const AuthFinder = withAuthFinder(() => Hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})


export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  public id: number

  @column()
  public email: string

  @column({ serializeAs: null })
  public password: string

  @column({ serializeAs: null })
  public reset_password: string | null

  @column.dateTime({ serializeAs: null })
  public reset_password_at: DateTime | null

  @column({ serializeAs: null })
  public code: string | null

  @column.dateTime({ serializeAs: null })
  public code_date_time: DateTime | null

  @column({ serializeAs: null })
  public code_confirm: string | null

  @column.dateTime({ serializeAs: null })
  public code_confirm_date_time: DateTime | null

  @column()
  public personal_data_id: number | null

  @column({ serializeAs: null })
  public enabled: boolean

  @column({ serializeAs: null })
  public is_admin: boolean

  @column({ serializeAs: null })
  public in_app: boolean

  @column()
  public client_id: number

  @column()
  public employee_id: number

  @column({ serializeAs: null })
  public last_login_at: DateTime | null

  @column({ serializeAs: null })
  public last_login_tz: string | null

  @column({ serializeAs: null })
  public verified: boolean

  @column.dateTime({ serializeAs: null })
  public verified_at: DateTime | null

  @column({ serializeAs: null })
  public updated_by: number | null

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updated_at: DateTime

  @hasOne(() => PersonalData)
  public personalData: HasOne<typeof PersonalData>

  @column()
  public signature: string | null
  @column()
  public signature_short: string | null
  @column()
  public signature_thumb: string | null
  @column()
  public signature_thumb_short: string | null

  @hasMany(() => BusinessUser)
  public businessUser: HasMany<typeof BusinessUser>

  @hasMany(() => Token)
  public tokens: HasMany<typeof Token>

  static refreshTokens = DbAccessTokensProvider.forModel(User, {
    prefix: 'rt_',
    table: 'jwt_refresh_tokens',
    type: 'jwt_refresh_token',
    tokenSecretLength: 40,
  })

  @beforeCreate()
  public static async setDefaults(user: User) {
    user.enabled = true
    user.code = Util.getCode().toString()
    user.code_date_time = Util.getDateTimesAddHours(DateTime.now(), 1)
    user.code_confirm = Util.getCode().toString()
    user.code_confirm_date_time = Util.getDateTimesAddHours(DateTime.now(), 1)
  }

  public serialize() {
    const serialized = super.serialize()
    // Custom date formatting
    if (serialized.reset_password_at) {
      serialized.reset_password_at = serialized.reset_password_at.format('YYYY-MM-DD HH:mm:ss')
    }
    for (const field of ['last_login_at', 'created_at', 'updated_at', 'verified_at', 'code_date_time', 'code_confirm_date_time']) {
      if (serialized[field]) {
        serialized[field] = DateTime.fromISO(serialized[field]).toFormat('dd/MM/yyyy hh:mm:ss a')
      }
    }
    return serialized
  }
}