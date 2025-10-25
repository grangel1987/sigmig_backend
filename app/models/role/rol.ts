
import BusinessUserRol from '#models/business/business_user_rol'
import Permission from '#models/permissions/permission'
import User from '#models/users/user'
import { BaseModel, beforeCreate, belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import RolPermission from './rol_permission.js'

export default class Rol extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public name: string

  @column()
  public description: string

  @column({ serializeAs: null })
  public is_system: boolean

  @column({ serializeAs: null })
  public enabled: boolean

  @column()
  public created_by: number | null

  @column()
  public updated_by: number | null

  @column.dateTime({ serializeAs: null })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updated_at: DateTime

  @hasMany(() => BusinessUserRol)
  public businessUserRol: HasMany<typeof BusinessUserRol>

  @hasMany(() => RolPermission)
  public rolsPermissions: HasMany<typeof RolPermission>

  @manyToMany(() => Permission, {
    pivotTable: 'rols_permissions',
    pivotForeignKey: 'rol_id',
    pivotRelatedForeignKey: 'permission_id',
  })
  public permissions: ManyToMany<typeof Permission>

  @belongsTo(() => User, { foreignKey: 'created_by' })
  public createdBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'updated_by' })
  public updatedBy: BelongsTo<typeof User>

  @beforeCreate()
  public static async setEnabled(rol: Rol) {
    rol.enabled = true
  }
}