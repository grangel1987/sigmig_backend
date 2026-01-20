import PaymentDocumentType from '#models/payment_document_type'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

export default class PaymentDocumentTypeController {
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

            const query = PaymentDocumentType.query()

            if (text) {
                query.where('name', 'LIKE', `%${text}%`)
            }

            query.orderBy('name', 'asc')

            const types = page ? await query.paginate(page, perPage || 10) : await query

            return response.status(200).json(types)
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
            const { name } = await request.validateUsing(
                vine.compile(
                    vine.object({
                        name: vine.string().trim(),
                        description: vine.string().trim().optional(),
                    })
                )
            )

            const type = await PaymentDocumentType.create({
                name,
                createdAt: DateTime.now(),
                updatedAt: DateTime.now(),
            })

            return response.status(201).json({
                type,
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
            const type = await PaymentDocumentType.findOrFail(params.id)
            return response.status(200).json(type)
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
            const { name } = await request.validateUsing(
                vine.compile(
                    vine.object({
                        name: vine.string().trim(),
                        description: vine.string().trim().optional(),
                    })
                )
            )

            const type = await PaymentDocumentType.findOrFail(params.id)

            type.name = name
            type.updatedAt = DateTime.now()

            await type.save()

            return response.status(200).json({
                type,
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
            const type = await PaymentDocumentType.findOrFail(params.id)
            await type.delete()

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
            const types = await PaymentDocumentType.query().orderBy('name', 'asc')

            return response.status(200).json(types.map((t) => ({ text: t.name, value: t.id })))
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
