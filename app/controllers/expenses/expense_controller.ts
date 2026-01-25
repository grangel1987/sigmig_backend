import Expense from '#models/expense'
import LedgerMovement from '#models/ledger_movement'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { searchWithStatusSchema } from '#validators/general'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import { log } from 'node:console'

// type MessageFrontEndType = { message: string; title: string }

export default class ExpenseController {
    /**
     * List expenses with optional pagination and filtering
     */
    public async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'expenses', 'view')

        const { request, response, i18n } = ctx

        try {
            const { page, perPage, status, text } = await request.validateUsing(
                vine.compile(
                    vine.object({
                        ...searchWithStatusSchema.getProperties(),
                        status: vine.enum(['paid', 'pending', 'canceled'] as const).optional(),
                    })
                )
            )

            let query = Expense.query()
                .preload('business', q => q.preload('typeIdentify'))
                .preload('currency', (q) => q.select(['id', 'symbol', 'name']))
                .preload('payments', (q) => {
                    q.preload('account')
                        .preload('costCenter')
                        .preload('paymentMethod')
                        .preload('documentType')
                })
                .orderBy('date', 'desc')

            if (text) {
                query = query.where((qb) => {
                    qb.whereRaw('description LIKE ?', [`%${text}%`])
                })
            }

            if (status !== undefined) {
                query = query.where('status', status)
            }

            const expenses = await (page ? query.paginate(page, perPage || 10) : query)

            return response.status(200).json({
                message: i18n.formatMessage('messages.fetch_successful', {}, 'Gastos obtenidos exitosamente'),
                data: expenses,
            })
        } catch (error) {
            log(error)
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.fetch_error', {}, 'Error al obtener gastos'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    /**
     * Create a new expense with its ledger movement
     */
    public async store(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'expenses', 'create')

        const { request, response, i18n } = ctx

        const trx = await db.transaction()
        try {
            const { businessId, date, amount, currencyId, description, accountId, costCenterId, clientId, paymentMethodId, documentTypeId, documentNumber } =
                await request.validateUsing(expenseStoreValidator)

            const expenseDate = DateTime.fromISO(date)

            // Create the expense record
            const expense = await Expense.create(
                {
                    businessId,
                    date: expenseDate,
                    amount,
                    currencyId,
                    description: description,
                    status: 'pending',
                },
                { client: trx }
            )

            // Create the associated ledger movement (negative amount for expense)
            const ledgerMovement = await LedgerMovement.create(
                {
                    businessId,
                    accountId,
                    costCenterId,
                    clientId,
                    date: expenseDate,
                    amount: -Math.abs(amount), // Negative for expense
                    currencyId,
                    paymentMethodId,
                    documentTypeId,
                    documentNumber,
                    concept: description || `Gasto #${expense.id}`,
                    status: 'pending',
                    expenseId: expense.id,
                },
                { client: trx }
            )

            await trx.commit()

            await expense.load('business', (q) => q.select(['id', 'name']))
            await expense.load('currency', (q) => q.select(['id', 'symbol', 'name']))

            return response.status(201).json({
                expense,
                ledgerMovement,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_ok'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            await trx.rollback()
            log(error)
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    /**
     * Show a specific expense with its ledger movement
     */
    public async show(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'expenses', 'view')

        const { params, response, i18n } = ctx
        const expenseId = Number(params.id)

        try {
            const expense = await Expense.query()
                .where('id', expenseId)
                .preload('business', (q) => q.preload('typeIdentify'))
                .preload('currency', (q) => q.select(['id', 'symbol', 'name']))
                .preload('payments', (q) => {
                    q.preload('account')
                        .preload('costCenter')
                        .preload('client', q =>
                            q.preload('city')
                                .preload('typeIdentify'))
                        .preload('paymentMethod')
                        .preload('documentType')

                })
                .firstOrFail()

            return response.status(200).json(expense)
        } catch (error) {
            log(error)
            return response.status(404).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.no_exist'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    /**
     * Update expense status and its ledger movement status
     */
    public async updateStatus(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'expenses', 'update')

        const { params, request, response, i18n } = ctx
        const expenseId = Number(params.id)

        const trx = await db.transaction()
        try {
            const { status } = await request.validateUsing(expenseStatusValidator)

            const expense = await Expense.query({ client: trx })
                .where('id', expenseId)
                .forUpdate()
                .firstOrFail()

            expense.status = status
            await expense.save()

            // Update associated ledger movements status
            await LedgerMovement.query({ client: trx })
                .where('expenseId', expenseId)
                .update({ status })

            await trx.commit()

            await expense.load('business', (q) => q.select(['id', 'name']))
            await expense.load('currency', (q) => q.select(['id', 'symbol', 'name']))
            await expense.load('payments', (q) => {
                q.preload('account')
                    .preload('costCenter')
                    .preload('client')
                    .preload('paymentMethod')
            })

            return response.status(200).json({
                expense,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_ok'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            await trx.rollback()
            log(error)
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    /**
     * Delete an expense and its ledger movements
     */
    public async delete(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'expenses', 'delete')

        const { params, response, i18n } = ctx
        const expenseId = Number(params.id)

        const trx = await db.transaction()
        try {
            // Delete ledger movements first
            await LedgerMovement.query({ client: trx })
                .where('expenseId', expenseId)
                .delete()

            // Delete the expense
            await Expense.query({ client: trx })
                .where('id', expenseId)
                .delete()

            await trx.commit()

            return response.status(200).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.delete_ok'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            await trx.rollback()
            log(error)
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.delete_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }
}

// Expense validators
const expenseStoreValidator = vine.compile(
    vine.object({
        businessId: vine.number().positive(),
        date: vine.string(),
        amount: vine.number().positive(),
        currencyId: vine.number().positive(),
        description: vine.string().optional(),
        accountId: vine.number().optional(),
        costCenterId: vine.number().optional(),
        clientId: vine.number().optional(),
        paymentMethodId: vine.number().optional(),
        documentTypeId: vine.number().optional(),
        documentNumber: vine.string().optional(),
    })
)

const expenseStatusValidator = vine.compile(
    vine.object({
        status: vine.enum(['paid', 'pending', 'canceled']),
    })
)
