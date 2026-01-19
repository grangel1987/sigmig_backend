import PaymentMethod from '#models/payment_method'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

export default class PaymentMethodController {
    public async index(ctx: HttpContext) {
        const { request, response, i18n } = ctx

        try {
            const { page, perPage, text } = await request.validateUsing(
                vine.compile(
                    vine.object({
                        page: vine.number().optional(),
                        perPage: vine.number().optional(),
                        text: vine.string().optional(),
                    })
                )
            )

            const query = PaymentMethod.query()

            if (text) {
                query.where('name', 'LIKE', `%${text}%`)
            }

            query.orderBy('name', 'asc')

            const methods = page ? await query.paginate(page, perPage || 10) : await query

            return response.status(200).json(methods)
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
            const { name, description } = await request.validateUsing(
                vine.compile(
                    vine.object({
                        name: vine.string().trim(),
                        description: vine.string().trim().optional(),
                    })
                )
            )

            const method = await PaymentMethod.create({
                name,
                description,
                createdAt: DateTime.now(),
                updatedAt: DateTime.now(),
            })

            return response.status(201).json({
                method,
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
            const method = await PaymentMethod.findOrFail(params.id)
            return response.status(200).json(method)
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
            const { name, description } = await request.validateUsing(
                vine.compile(
                    vine.object({
                        name: vine.string().trim(),
                        description: vine.string().trim().optional(),
                    })
                )
            )

            const method = await PaymentMethod.findOrFail(params.id)

            method.name = name
            method.description = description
            method.updatedAt = DateTime.now()

            await method.save()

            return response.status(200).json({
                method,
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
            const method = await PaymentMethod.findOrFail(params.id)
            await method.delete()

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
        const { response, i18n } = ctx

        try {
            const methods = await PaymentMethod.query().orderBy('name', 'asc')

            return response.status(200).json(methods.map((m) => ({ text: m.name, value: m.id })))
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
