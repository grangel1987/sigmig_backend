import Account from '#models/bank/account'
import BudgetPayment from '#models/budget_payment'
import Client from '#models/clients/client'
import CostCenter from '#models/cost_centers/cost_center'
import Expense from '#models/expense'
import PaymentMethod from '#models/payment_method'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class LedgerMovement extends BaseModel {
  public static table = 'ledger_movements'

  @column({ isPrimary: true })
  public id: number

  @column()
  public accountId?: number

  @belongsTo(() => Account, { foreignKey: 'accountId' })
  public account: BelongsTo<typeof Account>

  @column()
  public costCenterId?: number

  @belongsTo(() => CostCenter, { foreignKey: 'costCenterId' })
  public costCenter: BelongsTo<typeof CostCenter>

  @column()
  public clientId?: number

  @belongsTo(() => Client, { foreignKey: 'clientId' })
  public client: BelongsTo<typeof Client>

  @column.date()
  public date: DateTime

  @column({
    prepare: (value?: number) => (value ?? null),
    consume: (value?: string | number) =>
      value === null || value === undefined ? 0 : Number(value),
  })
  public amount: number

  @column()
  public currencyId: number

  @column()
  public paymentMethodId?: number

  @belongsTo(() => PaymentMethod, { foreignKey: 'paymentMethodId' })
  public paymentMethod: BelongsTo<typeof PaymentMethod>

  @column()
  public documentTypeId?: number

  @column()
  public documentNumber?: string

  @column()
  public concept?: string

  @column()
  public status?: 'paid' | 'pending' | 'voided'

  @column()
  public budgetPaymentId?: number

  @belongsTo(() => BudgetPayment, { foreignKey: 'budgetPaymentId' })
  public budgetPayment: BelongsTo<typeof BudgetPayment>

  @column()
  public expenseId?: number

  @belongsTo(() => Expense, { foreignKey: 'expenseId' })
  public expense: BelongsTo<typeof Expense>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  public isIncome() {
    return this.amount > 0
  }

  public isExpense() {
    return this.amount < 0
  }

  public incomeAmount() {
    return this.amount > 0 ? this.amount : 0
  }

  public expenseAmount() {
    return this.amount < 0 ? -this.amount : 0
  }
}
