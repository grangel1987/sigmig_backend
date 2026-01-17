import LedgerMovement from '#models/ledger_movement'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { searchWithStatusSchema } from '#validators/general'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

// type MessageFrontEndType = { message: string; title: string }

export default class BalancesController {
    /**
     * List ledger movements with preloaded relationships
     * Supports pagination and filtering
     */
    public async getMovements(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'balances', 'view')

        const { request, response, i18n } = ctx

        try {
            const { page, perPage, status, text } = await request.validateUsing(
                vine.compile(
                    vine.object({
                        ...searchWithStatusSchema.getProperties(),
                    })
                )
            )

            let query = LedgerMovement.query()
                .preload('account')
                .preload('costCenter')
                .preload('client')
                .preload('paymentMethod')
                .preload('budgetPayment')
                .preload('expense')
                .orderBy('date', 'desc')

            if (text) {
                query = query.where((qb) => {
                    qb.whereRaw('concept LIKE ?', [`%${text}%`])
                        .orWhereRaw('documentNumber LIKE ?', [`%${text}%`])
                        .orWhereHas('client', (b) => b.whereRaw('name LIKE ?', [`%${text}%`]))
                        .orWhereHas('account', (b) => b.whereRaw('name LIKE ?', [`%${text}%`]))
                })
            }

            if (status !== undefined) {
                query = query.where('status', status)
            }

            const movements = await (page ? query.paginate(page, perPage || 10) : query)

            return response.status(200).json({
                message: i18n.formatMessage('messages.fetch_successful', {}, 'Movimientos obtenidos exitosamente'),
                data: movements,
            })
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
}
