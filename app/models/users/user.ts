// import BusinessUser from '#models/business_user'
// import PersonalData from '#models/personal_data'
import Token from '#models/users/token'
import Util from '#utils/Util'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Hash from '@adonisjs/core/services/hash'

import BusinessUser from '#models/business/business_user'
import Employee from '#models/employees/employee'
import Position from '#models/positions/position'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, beforeCreate, belongsTo, column, computed, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
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
  public resetPassword: string | null

  @column.dateTime({ serializeAs: null })
  public resetPasswordAt: DateTime | null

  @column({ serializeAs: null })
  public code: string | null

  @column.dateTime({ serializeAs: null })
  public codeDateTime: DateTime | null

  @column()
  declare personalDataId: number

  @column({ serializeAs: null })
  public codeConfirm: string | null

  @column.dateTime({ serializeAs: null })
  public codeConfirmDateTime: DateTime | null

  @column()
  public enabled: boolean

  @column()
  public isAdmin: boolean

  @column()
  public isAuthorizer: boolean

  @column({ serializeAs: null })
  public inApp: boolean

  @column({ serializeAs: null })
  public lastLoginAt: DateTime | null

  @column({ serializeAs: null })
  public lastLoginTz: string | null

  @column({ serializeAs: null })
  public verified: boolean

  @column.dateTime({ serializeAs: null })
  public verifiedAt: DateTime | null

  @column({ serializeAs: null })
  public updatedBy: number | null

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime

  @column({ columnName: 'position_id' })
  public positionId: number | null

  @belongsTo(() => PersonalData)
  public personalData: BelongsTo<typeof PersonalData>

  @column()
  public signature: string | null
  @column()
  public signatureShort: string | null
  @column()
  public signatureThumb: string | null
  @column()
  public signatureThumbShort: string | null

  @hasMany(() => BusinessUser)
  public businessUser: HasMany<typeof BusinessUser>

  @hasMany(() => Token)
  public tokens: HasMany<typeof Token>

  @hasOne(() => BusinessUser, { onQuery: (bQ) => bQ.where('selected', 1) })
  declare selectedBusiness: HasOne<typeof BusinessUser>

  @belongsTo(() => Position, { foreignKey: 'positionId' })
  public position: BelongsTo<typeof Position>

  @hasMany(() => Employee, { foreignKey: 'employeeId' })
  public employee: HasMany<typeof Employee>



  @computed()
  public get full_name() {
    const pData = this.personalData
    return pData ? `${pData.names || ''} ${pData.lastNameM || ''} ${pData.lastNameP || ''}` : undefined
  }

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
    user.codeDateTime = Util.getDateTimesAddHours(DateTime.now(), 1)
    user.codeConfirm = Util.getCode().toString()
    user.codeConfirmDateTime = Util.getDateTimesAddHours(DateTime.now(), 1)
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