
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
  public isSystem: boolean

  @column({ serializeAs: null })
  public enabled: boolean

  @column({ columnName: 'createdById' })
  public createdById: number | null

  @column({ columnName: 'updatedById' })
  public updatedById: number | null

  @column.dateTime({ serializeAs: null })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime

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

  @belongsTo(() => User, { foreignKey: 'createdById' })
  public createdBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'updatedById' })
  public updatedBy: BelongsTo<typeof User>

  @beforeCreate()
  public static async setEnabled(rol: Rol) {
    rol.enabled = true
  }
}