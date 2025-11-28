import SettingSchedule from '#models/schedules/setting_schedule'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import { settingScheduleStoreValidator, settingScheduleUpdateValidator } from '#validators/setting_schedule'
import { HttpContext } from '@adonisjs/core/http'
import Database from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'

export default class SettingScheduleController {
    /** List schedules for selected business of current user */
    async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view');

        const { request, auth } = ctx
        const { page, perPage } = await request.validateUsing(
            vine.compile(
                vine.object({
                    page: vine.number().positive().optional(),
                    perPage: vine.number().positive().optional(),
                })
            )
        )

        const userId = auth.user!.id
        const business = await Database.from('business_users').where('selected', true).where('user_id', userId).first()
        const businessId = business?.business_id
        if (!businessId) return []

        const query = SettingSchedule.query()
            .where('business_id', businessId)
            .preload('createdBy', (b) => {
                b.select(['id', 'personal_data_id', 'email']).preload('personalData')
            })
            .preload('updatedBy', (b) => {
                b.select(['id', 'personal_data_id', 'email']).preload('personalData')
            })

        return page ? query.paginate(page, perPage ?? 10) : query
    }

    async show(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view');

        const { params } = ctx
        const scheduleId = Number(params.schedule_id || params.id)
        const schedule = await SettingSchedule.find(scheduleId)
        return schedule
    }

    async store(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'create');

        const { request, response, auth, i18n } = ctx
        const { businessId, name, workDays, daysOff, events, minFlexIn, minFlexOut } = await request.validateUsing(
            settingScheduleStoreValidator
        )
        const dateTime = await Util.getDateTimes(request)

        try {
            let eventsStr = events
            if (eventsStr) {
                const eventsAux = JSON.parse(eventsStr)
                for (const key in eventsAux) {
                    const item = eventsAux[key]
                    if (item?.periods) {
                        for (const periodIndex in item.periods) {
                            if (!item.periods[periodIndex].key) item.periods[periodIndex].key = Util.getCode()
                        }
                    }
                }
                eventsStr = JSON.stringify(eventsAux)
            }

            const payload = {
                businessId: businessId,
                name,
                workDays: workDays ?? 0,
                daysOff: daysOff ?? 0,
                minutesInt: minFlexIn ?? 0,
                minutesOut: minFlexOut ?? 0,
                events: eventsStr ?? '',
                createdAt: dateTime,
                updatedAt: dateTime,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
            }

            const schedule = await SettingSchedule.create(payload)
            await schedule.load('createdBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            await schedule.load('updatedBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))

            return response.status(201).json({
                schedule,
                ...MessageFrontEnd(i18n.formatMessage('messages.store_ok'), i18n.formatMessage('messages.ok_title')),
            })
        } catch (error) {
            console.error(error)
            return response
                .status(500)
                .json(MessageFrontEnd(i18n.formatMessage('messages.store_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    async update(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'update');

        const { params, request, response, auth, i18n } = ctx
        const scheduleId = Number(params.id)
        const { name, workDays, daysOff, events } = await request.validateUsing(settingScheduleUpdateValidator)
        const dateTime = await Util.getDateTimes(request)
        try {
            const schedule = await SettingSchedule.findOrFail(scheduleId)

            let eventsStr = events
            if (eventsStr) {
                const eventsAux = JSON.parse(eventsStr)
                for (const key in eventsAux) {
                    const item = eventsAux[key]
                    if (item?.periods) {
                        for (const periodIndex in item.periods) {
                            if (!item.periods[periodIndex].key) item.periods[periodIndex].key = Util.getCode()
                        }
                    }
                }
                eventsStr = JSON.stringify(eventsAux)
            }

            schedule.merge({
                name: name ?? schedule.name,
                workDays: workDays ?? schedule.workDays,
                daysOff: daysOff ?? schedule.daysOff,
                events: eventsStr ?? schedule.events,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await schedule.save()

            await schedule.load('createdBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            await schedule.load('updatedBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))

            return response.status(201).json({
                schedule,
                ...MessageFrontEnd(i18n.formatMessage('messages.update_ok'), i18n.formatMessage('messages.ok_title')),
            })
        } catch (error) {
            console.error(error)
            return response
                .status(500)
                .json(MessageFrontEnd(i18n.formatMessage('messages.update_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    async changeStatus(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'update');

        const { params, request, response, auth, i18n } = ctx
        const scheduleId = Number(params.id)
        const dateTime = await Util.getDateTimes(request)
        try {
            const schedule = await SettingSchedule.findOrFail(scheduleId)
            schedule.enabled = !schedule.enabled
            schedule.updatedById = auth.user!.id
            schedule.updatedAt = dateTime
            await schedule.save()

            await schedule.load('createdBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            await schedule.load('updatedBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))

            return response.status(201).json({
                schedule,
                ...MessageFrontEnd(
                    i18n.formatMessage(schedule.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            console.error(error)
            return response
                .status(500)
                .json(MessageFrontEnd(i18n.formatMessage('messages.update_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    async select(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view');

        const { auth } = ctx
        const userId = auth.user!.id
        const business = await Database.from('business_users').where('selected', true).where('user_id', userId).first()
        const businessId = business?.business_id
        if (!businessId) return []
        const schedules = await SettingSchedule.query()
            .select(['id', 'name', 'work_days', 'days_off'])
            .where('business_id', businessId)
            .where('enabled', true)
        return schedules
    }
}
