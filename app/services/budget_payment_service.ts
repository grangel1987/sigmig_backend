import BudgetPayment from '#models/budget_payment'
import BudgetPaymentLine from '#models/budget_payment_line'
import LedgerMovement from '#models/ledger_movement'
import PaymentDocumentType from '#models/payment_document_type'
import BudgetPaymentValidator from '#validators/budget_payment_validator'
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
    isProjected?: boolean
    receivedAt?: DateTime | Date | string | null
    lines?: Array<{
        bugetProductId?: number | null
        bugetItemId?: number | null
        amount?: number | null
    }>
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
            // Validate the payment amount against remaining budget
            if (params.budgetId) {
                const validation = await BudgetPaymentValidator.validatePaymentAmount(
                    params.budgetId,
                    params.amount
                )
                BudgetPaymentValidator.throwIfInvalid(
                    validation,
                    params.budgetId,
                    params.amount
                )
            }

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

            if (params.lines?.length) {
                const linesPayload = params.lines.map((line) => ({
                    budgetPaymentId: budgetPayment.id,
                    bugetProductId: line.bugetProductId ?? null,
                    bugetItemId: line.bugetItemId ?? null,
                    amount: line.amount ?? null,
                }))

                await BudgetPaymentLine.createMany(linesPayload, { client: trx })
            }
            const documentType = params.documentTypeId
                ? await PaymentDocumentType.query({ client: trx })
                    .where('id', params.documentTypeId)
                    .first()
                : null

            const hasDocumentNumber = Boolean(params.documentNumber?.trim())
            const isProjected = params.isProjected ?? documentType?.isProjected ?? false
            const forcedPaid = hasDocumentNumber && params.status !== 'voided'
            const status = forcedPaid ? 'paid' : params.status ?? 'pending'
            const receivedAt = forcedPaid
                ? params.receivedAt
                    ? DateTime.isDateTime(params.receivedAt)
                        ? params.receivedAt
                        : typeof params.receivedAt === 'string'
                            ? DateTime.fromISO(params.receivedAt)
                            : DateTime.fromJSDate(params.receivedAt)
                    : DateTime.now()
                : params.receivedAt === undefined || params.receivedAt === null
                    ? null
                    : DateTime.isDateTime(params.receivedAt)
                        ? params.receivedAt
                        : typeof params.receivedAt === 'string'
                            ? DateTime.fromISO(params.receivedAt)
                            : DateTime.fromJSDate(params.receivedAt)

            const finalIsProjected = forcedPaid ? false : isProjected

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
                    status,
                    isProjected: finalIsProjected,
                    receivedAt,
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

            // Validate the new amount if being changed
            if (params.amount !== undefined && params.amount !== budgetPayment.amount) {
                const validation = await BudgetPaymentValidator.validateForUpdate(
                    budgetPaymentId,
                    params.amount
                )
                BudgetPaymentValidator.throwIfInvalid(validation, budgetPayment.budgetId, params.amount)
            }

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

            if (params.lines?.length) {
                await BudgetPaymentLine.query({ client: trx })
                    .where('budget_payment_id', budgetPaymentId)
                    .delete()

                const linesPayload = params.lines.map((line) => ({
                    budgetPaymentId,
                    bugetProductId: line.bugetProductId ?? null,
                    bugetItemId: line.bugetItemId ?? null,
                    amount: line.amount ?? null,
                }))

                await BudgetPaymentLine.createMany(linesPayload, { client: trx })
            }

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
            let updatedDocumentType: PaymentDocumentType | null = null
            if (params.documentTypeId !== undefined) {
                ledgerMovement.documentTypeId = params.documentTypeId
                updatedDocumentType = await PaymentDocumentType.query({ client: trx })
                    .where('id', params.documentTypeId)
                    .first()
            }
            if (params.documentNumber !== undefined)
                ledgerMovement.documentNumber = params.documentNumber
            if (params.concept !== undefined) ledgerMovement.concept = params.concept
            if (params.status !== undefined) ledgerMovement.status = params.status
            if (params.isProjected !== undefined) ledgerMovement.isProjected = params.isProjected
            if (params.receivedAt !== undefined) {
                ledgerMovement.receivedAt =
                    params.receivedAt === null
                        ? null
                        : DateTime.isDateTime(params.receivedAt)
                            ? params.receivedAt
                            : typeof params.receivedAt === 'string'
                                ? DateTime.fromISO(params.receivedAt)
                                : DateTime.fromJSDate(params.receivedAt)
            }

            const docNumberNow = params.documentNumber?.trim()
            const markReceived = Boolean(docNumberNow) && params.status !== 'voided'
            if (markReceived) {
                if (!ledgerMovement.receivedAt) ledgerMovement.receivedAt = DateTime.now()
                if (params.status === undefined) ledgerMovement.status = 'paid'
                ledgerMovement.isProjected = false
            } else if (params.documentTypeId !== undefined && params.isProjected === undefined) {
                ledgerMovement.isProjected = updatedDocumentType?.isProjected ?? ledgerMovement.isProjected
            }

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
            .preload('lines', (q) => {
                q.preload('bugetProduct')
                q.preload('bugetItem')
            })
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

    /**
     * Get budget payment status with validation info
     * Returns total, paid, remaining amounts and payment progress
     */
    static async getPaymentStatus(budgetId: number) {
        return await BudgetPaymentValidator.getBudgetPaymentStatus(budgetId)
    }
}

