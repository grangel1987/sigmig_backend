import SettingAsset from '#models/asset/setting_asset';
import MessageFrontEnd from '#utils/MessageFrontEnd';
import { HttpContext } from '@adonisjs/core/http';
import vine from '@vinejs/vine';
import { DateTime } from 'luxon';

type MessageFrontEndType = {
    message: string
    title: string
}

export default class SettingAssetController {
    public async index({ request, response, i18n }: HttpContext) {
        const { page, perPage } = await request.validateUsing(
            vine.compile(
                vine.object({
                    page: vine.number().positive().optional(),
                    perPage: vine.number().positive().optional(),
                })
            )
        )

        try {
            const query = SettingAsset.query()
                .preload('createdBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })
                .preload('updatedBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })

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

    public async store({ request, response, auth, i18n }: HttpContext) {
        const data = await request.validateUsing(
            vine.compile(
                vine.object({
                    code: vine.string().trim().unique({ table: 'setting_assets', column: 'code' }),
                    name: vine.string().trim(),
                    type: vine.string(),
                    taxable: vine.boolean(),
                    tributable: vine.boolean(),
                    gratifying: vine.boolean(),
                    extraHours: vine.boolean(),
                })
            )
        )
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

    public async update({ params, request, response, auth, i18n }: HttpContext) {
        const assetId = params.id
        const data = await request.validateUsing(
            vine.compile(
                vine.object({
                    code: vine.string().trim(),
                    name: vine.string().trim(),
                    type: vine.string(),
                    taxable: vine.boolean(),
                    tributable: vine.boolean(),
                    gratifying: vine.boolean(),
                    extraHours: vine.boolean(),
                })
            )
        )
        const dateTime = DateTime.local()

        try {
            const asset = await SettingAsset.findOrFail(assetId)

            asset.merge({
                code: data.code,
                name: data.name,
                type: data.type,
                taxable: data.taxable,
                tributable: data.tributable,
                gratifying: data.gratifying,
                extraHours: data.extraHours,
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

    public async changeStatus({ params, response, auth, i18n }: HttpContext) {
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