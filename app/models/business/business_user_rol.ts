import Rol from '#models/role/rol'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BusinessUserRol extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public businessUserId: number

  @column()
  public rolId: number

  @belongsTo(() => Rol)
  public rols: BelongsTo<typeof Rol>
}