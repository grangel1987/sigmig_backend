import SettingCertificateHealthItem from '#models/certificate_health_item/setting_certificate_health_item'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { certificateHealthItemStoreValidator, certificateHealthItemUpdateValidator } from '#validators/certificate_health_item'
import { indexFiltersWithStatus } from '#validators/general'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

type MessageFrontEndType = {
    message: string
    title: string
}

export default class SettingCertificateHealthItemController {
    public async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view');

        const { request, response, i18n } = ctx
        const { page, perPage, text, status } = await request.validateUsing(indexFiltersWithStatus)

        try {
            const query = SettingCertificateHealthItem.query()
                .preload('createdBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })
                .preload('updatedBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })
                .orderBy('position', 'asc')

            if (text) {
                const likeVal = `%${text}%`
                query.where((qb) => {
                    qb.whereILike('name', likeVal).orWhereILike('type', likeVal)
                })
            }

            if (status !== undefined) {
                query.where('enabled', status === 'enabled')
            }

            const items = await (page ? query.paginate(page, perPage || 10) : query)

            return items
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
        await PermissionService.requirePermission(ctx, 'settings', 'create');

        const { request, response, auth, i18n } = ctx
        const data = await request.validateUsing(certificateHealthItemStoreValidator)
        const dateTime = DateTime.local()

        try {
            await db.from('setting_certificate_health_items')
                .where('position', '>=', data.position)
                .increment('position', 1)

            const item = await SettingCertificateHealthItem.create({
                name: data.name,
                type: data.type,
                position: data.position,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            })

            await item.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await item.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                item,
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
        await PermissionService.requirePermission(ctx, 'settings', 'update');

        const { params, request, response, auth, i18n } = ctx
        const itemId = params.id
        const data = await request.validateUsing(certificateHealthItemUpdateValidator)
        const dateTime = DateTime.local()

        try {
            const item = await SettingCertificateHealthItem.findOrFail(itemId)

            if (data.position !== undefined && item.position !== data.position) {
                await db.from('setting_certificate_health_items')
                    .where('position', '>=', data.position)
                    .whereNot('id', itemId)
                    .increment('position', 1)
            }

            const payload: Record<string, unknown> = {}
            if (data.name !== undefined) payload.name = data.name
            if (data.type !== undefined) payload.type = data.type
            if (data.position !== undefined) payload.position = data.position
            item.merge({
                ...payload,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await item.save()

            await item.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await item.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                item,
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
        await PermissionService.requirePermission(ctx, 'settings', 'update');

        const { params, response, auth, i18n } = ctx
        const itemId = params.id
        const dateTime = DateTime.local()

        try {
            const item = await SettingCertificateHealthItem.findOrFail(itemId)
            const status = !item.enabled
            item.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await item.save()

            await item.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await item.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                item,
                message: i18n.formatMessage(item.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
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
        await PermissionService.requirePermission(ctx, 'settings', 'view');

        const { response, i18n } = ctx
        try {
            const items = await SettingCertificateHealthItem.query()
                .select(['id', 'name', 'type'])
                .where('enabled', true)
                .orderBy('position', 'asc')

            return items
        } catch {
            response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }

    }
}