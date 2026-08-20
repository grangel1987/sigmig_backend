import Buget from '#models/bugets/buget'
import BudgetPayment from '#models/budget_payment'
import BudgetEdpDetail from '#models/budget_edp_detail'
import User from '#models/users/user'
import { BaseModel, belongsTo, column, hasMany, beforeCreate } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BudgetEdp extends BaseModel {
  public static table = 'budget_edps'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'budget_id' })
  declare budgetId: number

  @belongsTo(() => Buget, { foreignKey: 'budgetId' })
  declare budget: BelongsTo<typeof Buget>

  @column({ columnName: 'edp_number' })
  declare edpNumber: number

  @column()
  declare name: string | null

  @column()
  declare token: string | null

  @column({
    prepare: (value?: number) => (value ?? null),
    consume: (value?: string | number) =>
      value === null || value === undefined ? 0 : Number(value),
  })
  declare percentage: number

  @column({
    prepare: (value?: number) => (value ?? null),
    consume: (value?: string | number) =>
      value === null || value === undefined ? 0 : Number(value),
  })
  declare amount: number

  @column.date({ columnName: 'due_date' })
  declare dueDate: DateTime | null

  @column()
  declare status: 'pending' | 'partial' | 'paid'

  @hasMany(() => BudgetPayment, { foreignKey: 'budgetEdpId' })
  declare payments: HasMany<typeof BudgetPayment>

  @hasMany(() => BudgetEdpDetail, { foreignKey: 'budgetEdpId' })
  declare details: HasMany<typeof BudgetEdpDetail>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column()
  declare deletedBy: number | null

  @column({ columnName: 'authorizer_id' })
  declare authorizerId: number | null

  @belongsTo(() => User, { foreignKey: 'authorizerId' })
  declare authorizer: BelongsTo<typeof User>

  @column({ columnName: 'approval_status' })
  declare approvalStatus: 'pending' | 'authorized' | 'rejected' | 'revision'

  @column({ columnName: 'client_observation' })
  declare clientObservation: string | null

  @column({ columnName: 'is_authorized' })
  declare isAuthorized: boolean

  @column.dateTime({ columnName: 'authorizer_at', serialize: (value: DateTime | null) => value?.toFormat('yyyy-LL-dd') })
  declare authorizerAt: DateTime | null

  @column({
    columnName: 'authorizer_data',
    consume: v => typeof v === 'string' ? JSON.parse(v) : v,
    prepare: v => typeof v === 'object' ? JSON.stringify(v) : v
  })
  declare authorizerData: { name: string, rut: string, authorizedAt: string } | null

  @beforeCreate()
  public static assignToken(edp: BudgetEdp) {
    if (!edp.token) {
      edp.token = randomUUID()
    }
    edp.isAuthorized = edp.isAuthorized ?? false
  }
}
