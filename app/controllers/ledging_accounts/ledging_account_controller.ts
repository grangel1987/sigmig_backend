import LedgingAccount from '#models/ledging_account'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

export default class LedgingAccountController {
    public async index(ctx: HttpContext) {
        const { request, response, i18n } = ctx

        try {
            const { page, perPage, text, type } = await request.validateUsing(
                vine.compile(
                    vine.object({
                        page: vine.number().optional(),
                        perPage: vine.number().optional(),
                        text: vine.string().optional(),
                        type: vine.enum(['income', 'expense']).optional(),
                    })
                )
            )

            const query = LedgingAccount.query()

            if (text) {
                query.where('name', 'LIKE', `%${text}%`)
            }

            if (type) {
                query.where('type', type)
            }

            query.orderBy('name', 'asc')

            const accounts = page ? await query.paginate(page, perPage || 10) : await query

            return response.status(200).json(accounts)
        } catch (error) {
            console.log(error)
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }

    public async store(ctx: HttpContext) {
        const { request, response, i18n } = ctx

        try {
            const { name, type } = await request.validateUsing(
                vine.compile(
                    vine.object({
                        name: vine.string().trim(),
                        type: vine.enum(['income', 'expense']),
                    })
                )
            )

            const account = await LedgingAccount.create({
                name,
                type,
                createdAt: DateTime.now(),
                updatedAt: DateTime.now(),
            })

            return response.status(201).json({
                account,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_ok'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            console.log(error)
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.store_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }

    public async show(ctx: HttpContext) {
        const { params, response, i18n } = ctx

        try {
            const account = await LedgingAccount.findOrFail(params.id)
            return response.status(200).json(account)
        } catch (error) {
            console.log(error)
            return response.status(404).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.no_exist'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }

    public async update(ctx: HttpContext) {
        const { request, params, response, i18n } = ctx

        try {
            const { name, type } = await request.validateUsing(
                vine.compile(
                    vine.object({
                        name: vine.string().trim().optional(),
                        type: vine.enum(['income', 'expense']).optional(),
                    })
                )
            )

            const account = await LedgingAccount.findOrFail(params.id)

            if (name !== undefined) account.name = name
            if (type !== undefined) account.type = type
            account.updatedAt = DateTime.now()

            await account.save()

            return response.status(200).json({
                account,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_ok'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            console.log(error)
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }

    public async delete(ctx: HttpContext) {
        const { params, response, i18n } = ctx

        try {
            const account = await LedgingAccount.findOrFail(params.id)
            await account.delete()

            return response.status(200).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.delete_ok'),
                    i18n.formatMessage('messages.ok_title')
                )
            )
        } catch (error) {
            console.log(error)
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.delete_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }

    public async select(ctx: HttpContext) {
        const { request, response, i18n } = ctx

        try {
            const { type } = await request.validateUsing(
                vine.compile(
                    vine.object({
                        type: vine.enum(['income', 'expense']).optional(),
                    })
                )
            )

            const query = LedgingAccount.query().orderBy('name', 'asc')

            if (type) {
                query.where('type', type)
            }

            const accounts = await query

            return response.status(200).json(accounts.map((a) => ({ text: a.name, value: a.id })))
        } catch (error) {
            console.log(error)
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }
}
