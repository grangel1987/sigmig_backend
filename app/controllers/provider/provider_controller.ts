import MessageFrontEnd from '#utils/MessageFrontEnd'

import Provider from '#models/provider/provider'
import ProviderProduct from '#models/provider/provider_product'
import ProviderRepository from '#repositories/provider/provider_repository'
import { providerStoreValidator, providerUpdateValidator } from '#validators/provider'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

type MessageFrontEndType = { message: string; title: string }

export default class ProviderController {
    /** List all providers */
    async index({ request, response, i18n }: HttpContext) {
        const { page, perPage } = await request.validateUsing(
            vine.compile(
                vine.object({
                    page: vine.number().positive().optional(),
                    perPage: vine.number().positive().optional(),
                })
            )
        )

        try {
            const query = Provider.query()
                .preload('createdBy', (b) =>
                    b.preload('personalData', (pd) => pd.select('names', 'last_name_p', 'last_name_m'))
                        .select(['id', 'personal_data_id', 'email'])
                )
                .preload('updatedBy', (b) =>
                    b.preload('personalData', (pd) => pd.select('names', 'last_name_p', 'last_name_m'))
                        .select(['id', 'personal_data_id', 'email'])
                )
                .preload('city', (b) => b.select('id', 'name'))

            const providers = page ? await query.paginate(page, perPage ?? 10) : await query

            return providers
        } catch (error) {
            console.error(error)
            return response.status(500).json(
                MessageFrontEnd(i18n.formatMessage('messages.error_title'), i18n.formatMessage('messages.error_title'))
            )
        }
    }

    /** Store new provider */
    async store({ request, response, auth, i18n }: HttpContext) {
        const data = await request.validateUsing(providerStoreValidator)
        const dateTime = DateTime.local()

        try {
            const provider = await Provider.create({
                ...data,
                cityId: data.city_id,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            })

            await provider.load('createdBy', (b) =>
                b.preload('personalData', (pd) => pd.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            )
            await provider.load('updatedBy', (b) =>
                b.preload('personalData', (pd) => pd.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            )
            await provider.load('city', (b) => b.select('id', 'name'))

            return response.status(201).json({
                provider,
                message: i18n.formatMessage('messages.store_ok'),
                title: i18n.formatMessage('messages.ok_title'),
            } as MessageFrontEndType)
        } catch (error) {
            console.error(error)
            return response.status(500).json(
                MessageFrontEnd(i18n.formatMessage('messages.store_error'), i18n.formatMessage('messages.error_title'))
            )
        }
    }

    /** Update provider */
    async update({ params, request, response, auth, i18n }: HttpContext) {
        const data = await request.validateUsing(providerUpdateValidator)
        const dateTime = DateTime.local()

        try {
            const provider = await Provider.findOrFail(params.id)
            provider.merge({
                ...data,
                cityId: data.city_id,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await provider.save()

            await provider.load('createdBy', (b) =>
                b.preload('personalData', (pd) => pd.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            )
            await provider.load('updatedBy', (b) =>
                b.preload('personalData', (pd) => pd.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            )
            await provider.load('city', (b) => b.select('id', 'name'))

            return response.status(200).json({
                provider,
                message: i18n.formatMessage('messages.update_ok'),
                title: i18n.formatMessage('messages.ok_title'),
            } as MessageFrontEndType)
        } catch (error) {
            console.error(error)
            return response.status(500).json(
                MessageFrontEnd(i18n.formatMessage('messages.update_error'), i18n.formatMessage('messages.error_title'))
            )
        }
    }

    /** Change provider status */
    async changeStatus({ params, response, auth, i18n }: HttpContext) {
        const dateTime = DateTime.local()

        try {
            const provider = await Provider.findOrFail(params.id)
            const status = !provider.enabled
            provider.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await provider.save()

            return response.status(200).json({
                provider,
                message: i18n.formatMessage(status ? 'messages.ok_enabled' : 'messages.ok_disabled'),
                title: i18n.formatMessage('messages.ok_title'),
            } as MessageFrontEndType)
        } catch (error) {
            console.error(error)
            return response.status(500).json(
                MessageFrontEnd(i18n.formatMessage('messages.update_error'), i18n.formatMessage('messages.error_title'))
            )
        }
    }

    /** Change product status */
    async changeStatusProduct({ params, response, auth, i18n }: HttpContext) {
        const productId = params.product_id
        const dateTime = DateTime.local()

        try {
            const product = await ProviderProduct.findOrFail(productId)
            const status = !product.enabled
            product.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await product.save()

            return response.status(200).json({
                product,
                message: i18n.formatMessage(status ? 'messages.ok_enabled' : 'messages.ok_disabled'),
                title: i18n.formatMessage('messages.ok_title'),
            } as MessageFrontEndType)
        } catch (error) {
            console.error(error)
            return response.status(500).json(
                MessageFrontEnd(i18n.formatMessage('messages.update_error'), i18n.formatMessage('messages.error_title'))
            )
        }
    }

    /** Autocomplete: Providers */
    async findAutoComplete({ request }: HttpContext) {
        const { val } = request.only(['val'])
        return await ProviderRepository.findAutoComplete(val)
    }

    /** Autocomplete: Provider Products */
    async findProductAutoComplete({ request }: HttpContext) {
        const { val, provider_id } = request.only(['val', 'provider_id'])
        return await ProviderRepository.findProductAutoComplete(provider_id, val)
    }

    /** Show single product */
    async showProduct({ params }: HttpContext) {
        return await ProviderProduct.findOrFail(params.product_id)
    }
}