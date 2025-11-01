import Account from '#models/bank/account';
import MessageFrontEnd from '#utils/MessageFrontEnd';
import { accountStoreValidator, accountUpdateValidator } from '#validators/bank';
import { HttpContext } from '@adonisjs/core/http';
import vine from '@vinejs/vine';
import { DateTime } from 'luxon';

type MessageFrontEndType = {
    message: string
    title: string
}

export default class AccountController {
    public async index({ request, response, i18n }: HttpContext) {
        try {
            const { page, perPage } = await request.validateUsing(
                vine.compile(
                    vine.object({
                        page: vine.number().positive().optional(),
                        perPage: vine.number().positive().optional(),
                    })
                )
            )

            const baseQuery = Account.query()
                .preload('typeIdentify', (builder) => {
                    builder.select(['id', 'text'])
                })
                .preload('bank', (builder) => {
                    builder.select(['id', 'text'])
                })
                .preload('typeAccount', (builder) => {
                    builder.select(['id', 'text'])
                })
                .preload('createdBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })
                .preload('updatedBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })

            const accounts = await (page ? baseQuery.paginate(page, perPage || 10) : baseQuery)
            return accounts
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
        const data = await request.validateUsing(accountStoreValidator)
        const dateTime = DateTime.local()

        try {
            const payload = {
                bankId: data.bankId,
                number: data.number,
                owner: data.owner,
                typeIdentifyId: data.typeIdentifyId,
                typeAccountId: data.typeAccountId,
                identify: data.identify,
                createdAt: dateTime,
                updatedAt: dateTime,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
            }

            const account = await Account.create(payload)

            await account.load('typeIdentify', (builder) => {
                builder.select(['id', 'text'])
            })
            await account.load('bank', (builder) => {
                builder.select(['id', 'text'])
            })
            await account.load('typeAccount', (builder) => {
                builder.select(['id', 'text'])
            })
            await account.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await account.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                account,
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
        const accountId = params.id
        const data = await request.validateUsing(accountUpdateValidator)
        const dateTime = DateTime.local()

        try {
            const account = await Account.findOrFail(accountId)

            const payload: Record<string, unknown> = {}
            if (data.bankId !== undefined) payload.bankId = data.bankId
            if (data.number !== undefined) payload.number = data.number
            if (data.owner !== undefined) payload.owner = data.owner
            if (data.typeIdentifyId !== undefined) payload.typeIdentifyId = data.typeIdentifyId
            if (data.typeAccountId !== undefined) payload.typeAccountId = data.typeAccountId
            if (data.identify !== undefined) payload.identify = data.identify
            account.merge({
                ...payload,
                updatedAt: dateTime,
                updatedById: auth.user!.id,
            })
            await account.save()

            await account.load('typeIdentify', (builder) => {
                builder.select(['id', 'text'])
            })
            await account.load('bank', (builder) => {
                builder.select(['id', 'text'])
            })
            await account.load('typeAccount', (builder) => {
                builder.select(['id', 'text'])
            })
            await account.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await account.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                account,
                message: i18n.formatMessage('messages.update_ok'),
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

    public async changeStatus({ params, response, auth, i18n }: HttpContext) {
        const accountId = params.id
        const dateTime = DateTime.local()

        try {
            const account = await Account.findOrFail(accountId)
            const status = !account.enabled
            account.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await account.save()

            await account.load('typeIdentify', (builder) => {
                builder.select(['id', 'text'])
            })
            await account.load('bank', (builder) => {
                builder.select(['id', 'text'])
            })
            await account.load('typeAccount', (builder) => {
                builder.select(['id', 'text'])
            })
            await account.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await account.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                account,
                message: i18n.formatMessage('messages.update_ok'),
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

    public async findAll({ response, i18n }: HttpContext) {


        try {
            const accounts = await Account.query()
                .where('enabled', true)
                .preload('typeIdentify', (builder) => {
                    builder.select(['id', 'text'])
                })
                .preload('bank', (builder) => {
                    builder.select(['id', 'text'])
                })
                .preload('typeAccount', (builder) => {
                    builder.select(['id', 'text'])
                })

            return accounts
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