import UnitType from '#models/unit_type'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { indexFiltersWithStatus } from '#validators/general'
import { unitTypeStoreValidator, unitTypeUpdateValidator } from '#validators/unit_type'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

type MessageFrontEndType = {
    message: string
    title: string
}

export default class UnitTypeController {
    public async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'config', 'view')

        const { request, response, i18n } = ctx
        const { page, perPage, text, status } = await request.validateUsing(indexFiltersWithStatus)

        try {
            const query = UnitType.query()
                .preload('createdBy', (builder) => {
                    builder
                        .preload('personalData', (pdQ) =>
                            pdQ.select('names', 'last_name_p', 'last_name_m')
                        )
                        .select(['id', 'personal_data_id', 'email'])
                })
                .preload('updatedBy', (builder) => {
                    builder
                        .preload('personalData', (pdQ) =>
                            pdQ.select('names', 'last_name_p', 'last_name_m')
                        )
                        .select(['id', 'personal_data_id', 'email'])
                })
                .orderBy('id', 'asc')

            if (text) {
                const likeVal = `%${text}%`
                query.whereILike('name', likeVal)
            }

            if (status !== undefined) {
                query.where('enabled', status === 'enabled')
            }

            const unitTypes = await (page ? query.paginate(page, perPage || 10) : query)

            return unitTypes
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
        await PermissionService.requirePermission(ctx, 'config', 'create')

        const { request, response, auth, i18n } = ctx
        const data = await request.validateUsing(unitTypeStoreValidator)
        const dateTime = DateTime.local()

        try {
            const unitType = await UnitType.create({
                name: data.name,
                type: data.type ?? null,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            })

            await unitType.load('createdBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) =>
                        pdQ.select('names', 'last_name_p', 'last_name_m')
                    )
                    .select(['id', 'personal_data_id', 'email'])
            })
            await unitType.load('updatedBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) =>
                        pdQ.select('names', 'last_name_p', 'last_name_m')
                    )
                    .select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                unitType,
                message: i18n.formatMessage('messages.store_ok'),
                title: i18n.formatMessage('messages.ok_title'),
            } as MessageFrontEndType)
        } catch (error) {
            console.log(error)
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    public async update(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'config', 'update')

        const { params, request, response, auth, i18n } = ctx
        const unitTypeId = params.id
        const data = await request.validateUsing(unitTypeUpdateValidator)
        const dateTime = DateTime.local()

        try {
            const unitType = await db.transaction(async (trx) => {
                const unitTypeOnTrx = await UnitType.query({ client: trx })
                    .where('id', unitTypeId)
                    .firstOrFail()

                const payload: Record<string, unknown> = {}
                if (data.name !== undefined) payload.name = data.name
                if (data.type !== undefined) payload.type = data.type

                unitTypeOnTrx.useTransaction(trx)
                unitTypeOnTrx.merge({
                    ...payload,
                    updatedById: auth.user!.id,
                    updatedAt: dateTime,
                })
                await unitTypeOnTrx.save()

                return unitTypeOnTrx
            })

            await unitType.load('createdBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) =>
                        pdQ.select('names', 'last_name_p', 'last_name_m')
                    )
                    .select(['id', 'personal_data_id', 'email'])
            })
            await unitType.load('updatedBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) =>
                        pdQ.select('names', 'last_name_p', 'last_name_m')
                    )
                    .select(['id', 'personal_data_id', 'email'])
            })

            return response.status(200).json({
                unitType,
                message: i18n.formatMessage('messages.update_ok'),
                title: i18n.formatMessage('messages.ok_title'),
            } as MessageFrontEndType)
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

    public async changeStatus(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'config', 'update')

        const { params, response, auth, i18n } = ctx
        const unitTypeId = params.id
        const dateTime = DateTime.local()

        try {
            const unitType = await UnitType.findOrFail(unitTypeId)
            const status = !unitType.enabled
            unitType.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await unitType.save()

            await unitType.load('createdBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) =>
                        pdQ.select('names', 'last_name_p', 'last_name_m')
                    )
                    .select(['id', 'personal_data_id', 'email'])
            })
            await unitType.load('updatedBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) =>
                        pdQ.select('names', 'last_name_p', 'last_name_m')
                    )
                    .select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                unitType,
                message: i18n.formatMessage('messages.update_ok'),
                title: i18n.formatMessage('messages.ok_title'),
            } as MessageFrontEndType)
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

    public async select(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'config', 'view')

        const { response, i18n } = ctx
        try {
            const unitTypes = await UnitType.query().where('enabled', true).orderBy('name', 'asc')

            const result = unitTypes.map((unitType) => ({
                text: unitType.name,
                value: unitType.id,
            }))

            return result
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

    public async autoComplete(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'config', 'view')

        const { request, response, i18n } = ctx
        const { text } = await request.validateUsing(
            vine.compile(
                vine.object({
                    text: vine.string().trim().minLength(1),
                })
            )
        )

        try {
            const unitTypes = await UnitType.query()
                .where('enabled', true)
                .whereILike('name', `%${text}%`)
                .orderBy('name', 'asc')
                .limit(50)

            const result = unitTypes.map((unitType) => ({
                text: unitType.name,
                value: unitType.id,
            }))

            return response.status(200).json(result)
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
}
