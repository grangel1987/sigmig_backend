import SettingAsset from '#models/asset/setting_asset';
import PermissionService from '#services/permission_service';
import MessageFrontEnd from '#utils/MessageFrontEnd';
import { assetStoreValidator, assetUpdateValidator } from '#validators/asset';
import { indexFiltersWithStatus } from '#validators/general';
import { HttpContext } from '@adonisjs/core/http';
import { DateTime } from 'luxon';

type MessageFrontEndType = {
    message: string
    title: string
}

export default class SettingAssetController {
    public async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view');

        const { request, response, i18n } = ctx
        const { page, perPage, text, status } = await request.validateUsing(indexFiltersWithStatus)

        try {
            const query = SettingAsset.query()
                .preload('createdBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })
                .preload('updatedBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })

            if (text) {
                const likeVal = `%${text}%`
                query.where((qb) => {
                    qb.whereILike('name', likeVal).orWhereILike('code', likeVal).orWhereILike('type', likeVal)
                })
            }

            if (status !== undefined) {
                query.where('enabled', status === 'enabled')
            }

            const assets = await (page ? query.paginate(page, perPage || 10) : query)

            return assets
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
        const data = await request.validateUsing(assetStoreValidator)
        const dateTime = DateTime.local()

        try {
            const asset = await SettingAsset.create({
                code: data.code,
                name: data.name,
                type: data.type,
                taxable: data.taxable,
                tributable: data.tributable,
                gratifying: data.gratifying,
                extraHours: data.extraHours,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            })

            await asset.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await asset.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                asset,
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
        const assetId = params.id
        const data = await request.validateUsing(assetUpdateValidator)
        const dateTime = DateTime.local()

        try {
            const asset = await SettingAsset.findOrFail(assetId)

            const payload: Record<string, unknown> = {}
            if (data.code !== undefined) payload.code = data.code
            if (data.name !== undefined) payload.name = data.name
            if (data.type !== undefined) payload.type = data.type
            if (data.taxable !== undefined) payload.taxable = data.taxable
            if (data.tributable !== undefined) payload.tributable = data.tributable
            if (data.gratifying !== undefined) payload.gratifying = data.gratifying
            if (data.extraHours !== undefined) payload.extraHours = data.extraHours

            asset.merge({
                ...payload,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await asset.save()

            await asset.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await asset.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                asset,
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
        const assetId = params.id
        const dateTime = DateTime.local()

        try {
            const asset = await SettingAsset.findOrFail(assetId)
            const status = !asset.enabled
            asset.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await asset.save()

            await asset.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await asset.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                asset,
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
}