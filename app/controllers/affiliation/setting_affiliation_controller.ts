import SettingAffiliation from '#models/affiliation/setting_affiliation'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { affiliationStoreValidator, affiliationUpdateValidator } from '#validators/affiliation'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

type MessageFrontEndType = {
    message: string
    title: string
}

export default class SettingAffiliationController {
    public async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view');

        const { request, response, i18n } = ctx
        const { page, perPage } = await request.validateUsing(
            vine.compile(
                vine.object({
                    page: vine.number().positive().optional(),
                    perPage: vine.number().positive().optional(),
                })
            )
        )

        try {
            const query = SettingAffiliation.query()
                .preload('createdBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })
                .preload('updatedBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })

            const affiliations = await (page ? query.paginate(page, perPage || 10) : query)

            return affiliations
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
        const data = await request.validateUsing(affiliationStoreValidator)
        const dateTime = DateTime.local()

        try {
            const affiliation = await SettingAffiliation.create({
                code: data.code,
                name: data.name,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            })

            await affiliation.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await affiliation.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                affiliation,
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
        const affiliationId = params.id
        const data = await request.validateUsing(affiliationUpdateValidator)
        const dateTime = DateTime.local()

        try {
            if (data.code) {
                const existing = await db.from('setting_affiliations')
                    .whereNot('id', affiliationId)
                    .where('code', data.code)
                    .first()

                if (existing) {
                    return response.status(500).json({
                        ...MessageFrontEnd(
                            i18n.formatMessage('messages.exists_code'),
                            i18n.formatMessage('messages.error_title')
                        ),
                    })
                }
            }

            const affiliation = await SettingAffiliation.findOrFail(affiliationId)
            const payload: Record<string, unknown> = {}
            if (data.code !== undefined) payload.code = data.code
            if (data.name !== undefined) payload.name = data.name
            affiliation.merge({
                ...payload,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await affiliation.save()

            await affiliation.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await affiliation.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                affiliation,
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
        const affiliationId = params.id
        const dateTime = DateTime.local()

        try {
            const affiliation = await SettingAffiliation.findOrFail(affiliationId)
            const status = !affiliation.enabled
            affiliation.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await affiliation.save()

            await affiliation.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await affiliation.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                affiliation,
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
        await PermissionService.requirePermission(ctx, 'settings', 'view');

        const { response, i18n } = ctx
        try {
            const affiliations = await SettingAffiliation.query()
                .where('enabled', true)
                .orderBy('id')

            const result = affiliations.map((affiliation) => ({
                text: `${affiliation.code} - ${affiliation.name}`,
                value: affiliation.id,
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
}