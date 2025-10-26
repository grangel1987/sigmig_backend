import Account from '#models/bank/account';
import MessageFrontEnd from '#utils/MessageFrontEnd';
import { HttpContext } from '@adonisjs/core/http';
import vine from '@vinejs/vine';
import { DateTime } from 'luxon';

type MessageFrontEndType = {
    message: string
    title: string
}

export default class AccountController {
    public async index({ response, i18n }: HttpContext) {
        try {
            const accounts = await Account.query()
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
        const data = await request.validateUsing(
            vine.compile(
                vine.object({
                    bankId: vine.number(),
                    number: vine.string(),
                    owner: vine.string(),
                    typeIdentifyId: vine.number(),
                    typeAccountId: vine.number(),
                    identify: vine.string(),
                })
            )
        )
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
        const data = await request.validateUsing(
            vine.compile(
                vine.object({
                    bankId: vine.number(),
                    number: vine.string(),
                    owner: vine.string(),
                    typeIdentifyId: vine.number(),
                    typeAccountId: vine.number(),
                    identify: vine.string(),
                })
            )
        )
        const dateTime = DateTime.local()

        try {
            const account = await Account.findOrFail(accountId)

            account.merge({
                bankId: data.bankId,
                number: data.number,
                owner: data.owner,
                typeIdentifyId: data.typeIdentifyId,
                typeAccountId: data.typeAccountId,
                identify: data.identify,
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