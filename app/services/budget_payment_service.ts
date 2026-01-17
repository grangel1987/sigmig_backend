import BudgetPayment from '#models/budget_payment'
import LedgerMovement from '#models/ledger_movement'
import Database from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

interface CreateBudgetPaymentParams {
    budgetId?: number
    accountId?: number
    costCenterId?: number
    clientId?: number
    date: DateTime | Date | string
    amount: number
    currencyId: number
    paymentMethodId?: number
    documentTypeId?: number
    documentNumber?: string
    concept?: string
    status?: 'paid' | 'pending' | 'voided'
    createdById?: number
    businessId?: number
}

export default class BudgetPaymentService {
    /**
     * Create a budget payment and its corresponding ledger movement
     */
    static async create(params: CreateBudgetPaymentParams) {
        const trx = await Database.transaction()
        console.log('Creating budget payment with params:', params)
        try {
            // Create the budget payment record
            const budgetPayment = await BudgetPayment.create(
                {
                    budgetId: params.budgetId,
                    amount: params.amount,
                    date: DateTime.isDateTime(params.date)
                        ? params.date
                        : typeof params.date === 'string'
                            ? DateTime.fromISO(params.date)
                            : DateTime.fromJSDate(params.date),
                    voided: false,
                    voidedAt: null,
                },
                { client: trx }
            )
            // Create the ledger movement linked to this budget payment
            const ledgerMovement = await LedgerMovement.create(
                {
                    businessId: params.businessId,
                    budgetPaymentId: budgetPayment.id,
                    accountId: params.accountId,
                    costCenterId: params.costCenterId,
                    clientId: params.clientId,
                    date: DateTime.isDateTime(params.date)
                        ? params.date
                        : typeof params.date === 'string'
                            ? DateTime.fromISO(params.date)
                            : DateTime.fromJSDate(params.date),
                    amount: params.amount,
                    currencyId: params.currencyId,
                    paymentMethodId: params.paymentMethodId,
                    documentTypeId: params.documentTypeId,
                    documentNumber: params.documentNumber,
                    concept: params.concept,
                    status: params.status ?? 'pending',
                },
                { client: trx }
            )

            await trx.commit()

            return {
                budgetPayment,
                ledgerMovement,
            }
        } catch (error) {
            await trx.rollback()
            throw error
        }
    }

    /**
     * Update a budget payment and its ledger movement
     */
    static async update(budgetPaymentId: number, params: Partial<CreateBudgetPaymentParams>) {
        const trx = await Database.transaction()

        try {
            const budgetPayment = await BudgetPayment.findOrFail(budgetPaymentId, { client: trx })

            // Update budget payment fields
            if (params.budgetId !== undefined) budgetPayment.budgetId = params.budgetId
            if (params.amount !== undefined) budgetPayment.amount = params.amount
            if (params.date !== undefined) {
                budgetPayment.date = DateTime.isDateTime(params.date)
                    ? params.date
                    : typeof params.date === 'string'
                        ? DateTime.fromISO(params.date)
                        : DateTime.fromJSDate(params.date)
            }
            await budgetPayment.save()

            // Find and update the related ledger movement
            const ledgerMovement = await LedgerMovement.query({ client: trx })
                .where('budget_payment_id', budgetPaymentId)
                .firstOrFail()

            if (params.accountId !== undefined) ledgerMovement.accountId = params.accountId
            if (params.costCenterId !== undefined) ledgerMovement.costCenterId = params.costCenterId
            if (params.clientId !== undefined) ledgerMovement.clientId = params.clientId
            if (params.date !== undefined) {
                ledgerMovement.date = DateTime.isDateTime(params.date)
                    ? params.date
                    : typeof params.date === 'string'
                        ? DateTime.fromISO(params.date)
                        : DateTime.fromJSDate(params.date)
            }
            if (params.amount !== undefined) ledgerMovement.amount = params.amount
            if (params.currencyId !== undefined) ledgerMovement.currencyId = params.currencyId
            if (params.paymentMethodId !== undefined)
                ledgerMovement.paymentMethodId = params.paymentMethodId
            if (params.documentTypeId !== undefined)
                ledgerMovement.documentTypeId = params.documentTypeId
            if (params.documentNumber !== undefined)
                ledgerMovement.documentNumber = params.documentNumber
            if (params.concept !== undefined) ledgerMovement.concept = params.concept
            if (params.status !== undefined) ledgerMovement.status = params.status

            await ledgerMovement.save()

            await trx.commit()

            return {
                budgetPayment,
                ledgerMovement,
            }
        } catch (error) {
            await trx.rollback()
            throw error
        }
    }

    /**
     * Delete a budget payment and its ledger movement
     */
    static async delete(budgetPaymentId: number) {
        const trx = await Database.transaction()

        try {
            // Delete related ledger movement first
            await LedgerMovement.query({ client: trx })
                .where('budget_payment_id', budgetPaymentId)
                .delete()

            // Delete the budget payment
            const budgetPayment = await BudgetPayment.findOrFail(budgetPaymentId, { client: trx })
            await budgetPayment.delete()

            await trx.commit()

            return { success: true }
        } catch (error) {
            await trx.rollback()
            throw error
        }
    }

    /**
     * Get budget payment with ledger movement
     */
    static async findWithLedgerMovement(budgetPaymentId: number) {
        const budgetPayment = await BudgetPayment.query()
            .where('id', budgetPaymentId)
            .firstOrFail()

        const ledgerMovement = await LedgerMovement.query()
            .where('budget_payment_id', budgetPaymentId)
            .preload('account')
            .preload('costCenter')
            .preload('client')
            .preload('paymentMethod')
            .first()

        return {
            budgetPayment,
            ledgerMovement,
        }
    }

    /**
     * Void a budget payment
     */
    static async void(budgetPaymentId: number) {
        const trx = await Database.transaction()

        try {
            const budgetPayment = await BudgetPayment.findOrFail(budgetPaymentId, { client: trx })

            // Mark as voided
            budgetPayment.voided = true
            budgetPayment.voidedAt = DateTime.now()
            await budgetPayment.save()

            // Also update the ledger movement status to voided
            const ledgerMovement = await LedgerMovement.query({ client: trx })
                .where('budget_payment_id', budgetPaymentId)
                .first()

            if (ledgerMovement) {
                ledgerMovement.status = 'voided'
                await ledgerMovement.save()
            }

            await trx.commit()

            return {
                budgetPayment,
                ledgerMovement,
            }
        } catch (error) {
            await trx.rollback()
            throw error
        }
    }
}
