import BusinessUser from '#models/business/business_user'
import Position from '#models/positions/position'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { positionStoreValidator, positionUpdateValidator } from '#validators/position'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

type Message = { message: string; title: string }

export default class PositionController {
    public async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'positions', 'view')

        const { auth, response, i18n, request } = ctx
        const { page, perPage } = await request.validateUsing(
            vine.compile(
                vine.object({
                    page: vine.number().positive().optional(),
                    perPage: vine.number().positive().optional(),
                })
            )
        )

        try {
            const userId = auth.user!.id
            const business = await BusinessUser.query()
                .from('business_users')
                .where('selected', 1)
                .where('user_id', userId)
                .firstOrFail()
            const businessId = business.businessId

            const baseQuery = Position.query()
                .where('business_id', businessId)
                .preload('createdBy', (builder) => {
                    builder
                        .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                        .select(['id', 'personal_data_id', 'email'])
                })
                .preload('updatedBy', (builder) => {
                    builder
                        .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                        .select(['id', 'personal_data_id', 'email'])
                })

            const positions = await (page ? baseQuery.paginate(page, perPage || 10) : baseQuery)
            return positions
        } catch (error) {
            console.log(error)
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    public async store(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'positions', 'create')

        const { request, response, auth, i18n } = ctx
        const { businessId, name } = await request.validateUsing(positionStoreValidator)
        const dateTime = DateTime.local()

        try {
            const position = await Position.create({
                businessId,
                name,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            })

            await position.load('createdBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })
            await position.load('updatedBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                position,
                message: i18n.formatMessage('messages.store_ok'),
                title: i18n.formatMessage('messages.ok_title'),
            } as Message)
        } catch (error) {
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    public async update(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'positions', 'update')

        const { request, params, response, auth, i18n } = ctx
        const positionId = params.id
        const { name } = await request.validateUsing(positionUpdateValidator)
        const dateTime = DateTime.local()

        try {
            const position = await Position.findOrFail(positionId)

            position.merge({
                name,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await position.save()

            await position.load('createdBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })
            await position.load('updatedBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                position,
                message: i18n.formatMessage('messages.update_ok'),
                title: i18n.formatMessage('messages.ok_title'),
            } as Message)
        } catch (error) {
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    public async changeStatus(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'positions', 'update')

        const { params, response, auth, i18n } = ctx
        const positionId = params.id
        const dateTime = DateTime.local()

        try {
            const position = await Position.findOrFail(positionId)
            const status = !position.enabled
            position.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await position.save()

            await position.load('createdBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })
            await position.load('updatedBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                position,
                message: i18n.formatMessage(position.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
                title: i18n.formatMessage('messages.ok_title'),
            } as Message)
        } catch (error) {
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    public async select(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'positions', 'view')

        const { auth, response, i18n } = ctx
        try {
            const userId = auth.user!.id
            const business = await BusinessUser.query()
                .from('business_users')
                .where('selected', 1)
                .where('user_id', userId)
                .firstOrFail()
            const businessId = business.businessId

            const positions = await Position.query()
                .where('enabled', true)
                .where('business_id', businessId)
                .orderBy('id')

            return positions.map((p) => ({ text: p.name, value: p.id }))
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
