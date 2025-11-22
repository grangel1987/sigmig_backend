import SettingLegalGratification from '#models/legal_gratifications/setting_legal_gratification'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import { settingLegalGratificationStoreValidator, settingLegalGratificationUpdateValidator } from '#validators/setting_legal_gratification'
import { HttpContext } from '@adonisjs/core/http'

export default class SettingLegalGratificationController {
    async index({ }: HttpContext) {
        try {
            const legalGrts = await SettingLegalGratification.query()
                .preload('createdBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
                .preload('updatedBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            return legalGrts
        } catch (error) {
            console.error(error)
            return []
        }
    }

    async store({ request, response, auth, i18n }: HttpContext) {
        const { name } = await request.validateUsing(settingLegalGratificationStoreValidator)
        const dateTime = await Util.getDateTimes(request.ip())
        try {
            const payload = {
                name,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            }
            const legalGrt = await SettingLegalGratification.create(payload)
            await legalGrt.load('createdBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            await legalGrt.load('updatedBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            return response.status(201).json({
                legalGratification: legalGrt,
                ...MessageFrontEnd(i18n.formatMessage('messages.store_ok'), i18n.formatMessage('messages.ok_title')),
            })
        } catch (error) {
            console.error(error)
            return response.status(500).json(
                MessageFrontEnd(i18n.formatMessage('messages.store_error'), i18n.formatMessage('messages.error_title'))
            )
        }
    }

    async update({ request, params, response, auth, i18n }: HttpContext) {
        const id = Number(params.id)
        const { name } = await request.validateUsing(settingLegalGratificationUpdateValidator)
        const dateTime = await Util.getDateTimes(request.ip())
        try {
            const legalGrt = await SettingLegalGratification.findOrFail(id)
            legalGrt.merge({ name, updatedById: auth.user!.id, updatedAt: dateTime })
            await legalGrt.save()
            await legalGrt.load('createdBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            await legalGrt.load('updatedBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            return response.status(201).json({
                legalGratification: legalGrt,
                ...MessageFrontEnd(i18n.formatMessage('messages.update_ok'), i18n.formatMessage('messages.ok_title')),
            })
        } catch (error) {
            console.error(error)
            return response.status(500).json(
                MessageFrontEnd(i18n.formatMessage('messages.update_error'), i18n.formatMessage('messages.error_title'))
            )
        }
    }

    async changeStatus({ params, request, response, auth, i18n }: HttpContext) {
        const id = Number(params.id)
        const dateTime = await Util.getDateTimes(request.ip())
        try {
            const legalGrt = await SettingLegalGratification.findOrFail(id)
            legalGrt.enabled = !legalGrt.enabled
            legalGrt.updatedById = auth.user!.id
            legalGrt.updatedAt = dateTime
            await legalGrt.save()
            await legalGrt.load('createdBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            await legalGrt.load('updatedBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            return response.status(201).json({
                legalGratification: legalGrt,
                ...MessageFrontEnd(
                    i18n.formatMessage(legalGrt.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            console.error(error)
            return response.status(500).json(
                MessageFrontEnd(i18n.formatMessage('messages.update_error'), i18n.formatMessage('messages.error_title'))
            )
        }
    }

    async select({ }: HttpContext) {
        const result: { text: string; value: number }[] = []
        const legalGrts = await SettingLegalGratification.query().where('enabled', true).orderBy('id')
        for (const legalGrt of legalGrts) {
            result.push({ text: legalGrt.name, value: legalGrt.id })
        }
        return result
    }
}
