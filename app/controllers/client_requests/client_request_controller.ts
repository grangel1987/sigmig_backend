import ClientRequest from '#models/client_requests/client_request'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import { HttpContext } from '@adonisjs/core/http'
import { randomUUID } from 'crypto'

export default class ClientRequestController {
    /**
     * Store a new client request (simplified conversion)
     * Expects: clientId (number), isBooking (boolean)
     */
    public async store(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'client_requests', 'create')

        const { request, response, i18n } = ctx
        const clientId = request.input('clientId') as number | undefined
        const isBooking = !!request.input('isBooking')

        if (!clientId) {
            return response.status(422).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_error'),
                    i18n.formatMessage('messages.error_title')
                ),
                errors: { clientId: 'clientId is required' },
            })
        }

        try {
            const now = await Util.getDateTimes(request.ip())
            const payload = {
                clientId,
                isBooking,
                token: randomUUID(),
                createdAt: now,
                updatedAt: now,
            }
            const clientRequest = await ClientRequest.create(payload)
            return response.status(201).json({
                clientRequest,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_ok'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    /** Find a client request by token */
    public async findByToken(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'client_requests', 'view')

        const { request, response, i18n } = ctx
        const token = request.input('token')
        if (!token) {
            return response.status(422).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                ),
                errors: { token: 'token is required' },
            })
        }

        try {
            const clientRequest = await ClientRequest.query()
                .where('token', token)
                .preload('client')
                .first()
            return clientRequest
        } catch (error) {
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    /** List requests by clientId */
    public async findRequestByClientId(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'client_requests', 'view')

        const { request, response, i18n } = ctx
        const clientId = request.input('clientId') as number | undefined
        if (!clientId) {
            return response.status(422).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                ),
                errors: { clientId: 'clientId is required' },
            })
        }

        try {
            const clientRequests = await ClientRequest.query()
                .where('client_id', clientId)
                .orderBy('id', 'desc')

            return clientRequests
        } catch (error) {
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }
}
