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
  declare id: number

  @column()
  declare accountId: number

  @belongsTo(() => Account, { foreignKey: 'accountId' })
  declare account: BelongsTo<typeof Account>

  @column()
  declare costCenterId: number

  @belongsTo(() => CostCenter, { foreignKey: 'costCenterId' })
  declare costCenter: BelongsTo<typeof CostCenter>

  @column()
  declare clientId: number

  @belongsTo(() => Client, { foreignKey: 'clientId' })
  declare client: BelongsTo<typeof Client>

  @column.date()
  declare date: DateTime

  @column({
    prepare: (value: number) => (value ?? null),
    consume: (value: string | number) =>
      value === null || value === undefined ? 0 : Number(value),
  })
  declare amount: number

  @column()
  declare currencyId: number

  @column()
  declare paymentMethodId: number

  @belongsTo(() => PaymentMethod, { foreignKey: 'paymentMethodId' })
  declare paymentMethod: BelongsTo<typeof PaymentMethod>

  @column()
  declare documentTypeId: number

  @column()
  declare documentNumber: string

  @column()
  declare concept: string

  @column()
  declare status: 'paid' | 'pending' | 'voided'

  @column()
  declare businessId: number

  @column()
  declare budgetPaymentId: number

  @belongsTo(() => BudgetPayment, { foreignKey: 'budgetPaymentId' })
  declare budgetPayment: BelongsTo<typeof BudgetPayment>

  @column()
  declare expenseId: number

  @belongsTo(() => Expense, { foreignKey: 'expenseId' })
  declare expense: BelongsTo<typeof Expense>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

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
