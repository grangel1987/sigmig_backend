import LedgerMovement from '#models/ledger_movement'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { HttpContext } from '@adonisjs/core/http'
import { ModelPaginator } from '@adonisjs/lucid/orm'
import vine from '@vinejs/vine'

export default class BalancesController {
    /**
     * List ledger movements with preloaded relationships
     * Supports pagination and filtering
     */
    public async getMovements(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'balances', 'view')

        const { request, response, i18n } = ctx

        try {
            const { page, perPage, status, text, documentTypeId, paymentMethodId, type } = await request.validateUsing(
                vine.compile(
                    vine.object({
                        page: vine.number().optional(),
                        perPage: vine.number().optional(),
                        text: vine.string().optional(),
                        status: vine.string().optional(),
                        documentTypeId: vine.number().optional(),
                        paymentMethodId: vine.number().optional(),
                        type: vine.enum(['income', 'expense']).optional(),
                    })
                )
            )

            let query = LedgerMovement.query()
                .preload('account')
                .preload('costCenter')
                .preload('client')
                .preload('paymentMethod')
                .preload('budgetPayment', (q: any) => {
                    q.preload('budget', (bq: any) => {
                        bq.preload('client', (cq: any) => {
                            cq.select(['id', 'name'])
                        })
                    })
                })
                .preload('expense', (q) => {
                    q.preload('business', (bq) => bq.select(['id', 'name']))
                        .preload('currency', (cq) => cq.select(['id', 'symbol', 'name']))
                })
                .orderBy('date', 'desc')

            if (text) {
                query = query.where((qb) => {
                    qb.whereRaw('concept LIKE ?', [`%${text}%`])
                        .orWhereRaw('document_number LIKE ?', [`%${text}%`])
                        .orWhereHas('client', (b) => b.whereRaw('name LIKE ?', [`%${text}%`]))
                        .orWhereHas('account', (b) => b.whereRaw('name LIKE ?', [`%${text}%`]))
                })
            }

            if (status !== undefined) {
                query = query.where('status', status)
            }

            if (documentTypeId !== undefined) {
                query = query.where('document_type_id', documentTypeId)
            }

            if (paymentMethodId !== undefined) {
                query = query.where('payment_method_id', paymentMethodId)
            }

            if (type !== undefined) {
                if (type === 'income') {
                    query = query.whereNotNull('budget_payment_id')
                } else if (type === 'expense') {
                    query = query.whereNotNull('expense_id')
                }
            }

            const movements = await (page ? query.paginate(page, perPage || 10) : query)

            // Format the movements into a unified structure
            const formattedData = this.formatMovements(movements instanceof ModelPaginator ? movements.all() : movements)

            if (movements instanceof ModelPaginator) {
                return response.status(200).json({
                    message: i18n.formatMessage('messages.fetch_successful', {}, 'Movimientos obtenidos exitosamente'),
                    data: formattedData,
                    meta: movements.getMeta(),
                })
            } else {
                return response.status(200).json({
                    message: i18n.formatMessage('messages.fetch_successful', {}, 'Movimientos obtenidos exitosamente'),
                    data: formattedData,
                })
            }
        } catch (error) {
            console.log(error)
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.fetch_error', {}, 'Error al obtener movimientos'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    /**
     * Format ledger movements into a unified structure
     */
    private formatMovements(movements: LedgerMovement[]) {
        return movements.map((movement) => {
            const isIncome = movement.budgetPayment
            // const isExpense = movement.expense

            // Build justifications array
            const justifications: Array<{
                type: 'budget_payment' | 'expense'
                id: number
                reference?: string
                description?: string
                budgetNumber?: string
                clientName?: string
            }> = []

            // Add budget payment justification
            if (movement.budgetPayment) {
                const budget = (movement.budgetPayment as any).budget
                justifications.push({
                    type: 'budget_payment',
                    id: movement.budgetPayment.id,
                    budgetNumber: budget?.nro,
                    clientName: budget?.client?.name,
                    reference: budget?.nro
                        ? `Pago cotización #${budget.nro}`
                        : undefined,
                })
            }

            // Add expense justification
            if (movement.expense) {
                justifications.push({
                    type: 'expense',
                    id: movement.expense.id,
                    description: movement.expense.description || undefined,
                    reference: `Gasto #${movement.expense.id}`,
                })
            }

            return {
                id: movement.id,
                date: movement.date,
                concept: movement.concept,
                amount: movement.amount,
                absoluteAmount: Math.abs(movement.amount),
                type: isIncome ? 'income' : 'expense',
                status: movement.status,
                currencyId: movement.currencyId,
                documentType: movement.documentTypeId,
                documentNumber: movement.documentNumber,

                // Related entities
                account: movement.account ? {
                    id: movement.account.id,
                    name: movement.account.owner,
                } : null,

                costCenter: movement.costCenter ? {
                    id: movement.costCenter.id,
                    name: movement.costCenter.name,
                    code: movement.costCenter.code,
                } : null,

                client: movement.client ? {
                    id: movement.client.id,
                    name: movement.client.name,
                } : null,

                paymentMethod: movement.paymentMethod ? {
                    id: movement.paymentMethod.id,
                    name: movement.paymentMethod.name,
                } : null,

                // Justifications
                justifications,

                // Metadata
                createdAt: movement.createdAt,
                updatedAt: movement.updatedAt,
            }
        })
    }
}
