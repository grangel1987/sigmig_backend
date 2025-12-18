import SettingLicTypeLicense from '#models/setting_lic/setting_lic_type_license'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { indexFiltersWithStatus } from '#validators/general'
import { licTypeLicenseStoreValidator, licTypeLicenseUpdateValidator } from '#validators/setting_lics'
import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

type MessageFrontEndType = {
    message: string
    title: string
}

export default class LicTypeLicenseController {
    public async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view');

        const { request, response, i18n } = ctx
        const { page, perPage, text, status } = await request.validateUsing(indexFiltersWithStatus)

        try {
            const query = SettingLicTypeLicense.query()
                .preload('createdBy', (builder) =>
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                )
                .preload('updatedBy', (builder) =>
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                )

            if (text) {
                const likeVal = `%${text}%`
                query.whereILike('name', likeVal)
            }

            if (status !== undefined) {
                query.where('enabled', status === 'enabled')
            }

            const typeLicenses = await (page ? query.paginate(page, perPage || 10) : query)

            return typeLicenses
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
        const data = await request.validateUsing(licTypeLicenseStoreValidator)
        const dateTime = DateTime.local()

        try {
            const typeLicense = await SettingLicTypeLicense.create({
                name: data.name,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            })

            await typeLicense.load('createdBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )
            await typeLicense.load('updatedBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )

            return response.status(201).json({
                typeLicense,
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
        const typeLicenseId = params.id
        const data = await request.validateUsing(licTypeLicenseUpdateValidator)
        const dateTime = DateTime.local()

        try {
            const typeLicense = await SettingLicTypeLicense.findOrFail(typeLicenseId)
            const payload: Record<string, unknown> = {}
            if (data.name !== undefined) payload.name = data.name
            typeLicense.merge({
                ...payload,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await typeLicense.save()

            await typeLicense.load('createdBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )
            await typeLicense.load('updatedBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )

            return response.status(201).json({
                typeLicense,
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
        const typeLicenseId = params.id
        const dateTime = DateTime.local()

        try {
            const typeLicense = await SettingLicTypeLicense.findOrFail(typeLicenseId)
            const status = !typeLicense.enabled
            typeLicense.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await typeLicense.save()

            await typeLicense.load('createdBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )
            await typeLicense.load('updatedBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )

            return response.status(201).json({
                typeLicense,
                message: i18n.formatMessage(typeLicense.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
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
            const typeLicenses = await SettingLicTypeLicense.query()
                .where('enabled', true)
                .orderBy('id')

            const result = typeLicenses.map((typeLicense) => ({
                text: typeLicense.name,
                value: typeLicense.id,
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