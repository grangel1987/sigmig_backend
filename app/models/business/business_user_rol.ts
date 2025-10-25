import Rol from '#models/role/rol'
import { BaseModel, column, hasOne } from '@adonisjs/lucid/orm'
import type { HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BusinessUserRol extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public business_user_id: number

  @column()
  public rol_id: number

  @column.dateTime({ serializeAs: null })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updated_at: DateTime

  @hasOne(() => Rol)
  public rols: HasOne<typeof Rol>
}