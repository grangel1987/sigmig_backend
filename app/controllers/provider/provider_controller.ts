import MessageFrontEnd from '#utils/MessageFrontEnd'
import { indexFiltersWithStatus } from '#validators/general'

import Provider from '#models/provider/provider'
import ProviderProduct from '#models/provider/provider_product'
import ProviderRepository from '#repositories/provider/provider_repository'
import PermissionService from '#services/permission_service'
import { providerStoreValidator, providerUpdateValidator } from '#validators/provider'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

type MessageFrontEndType = { message: string; title: string }

export default class ProviderController {
    /** List all providers */
    async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'providers', 'view')

        const { request, response, i18n } = ctx
        const { page, perPage, text, status } = await request.validateUsing(indexFiltersWithStatus)

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

            if (text) {
                const like = `%${text}%`
                query.where((qb) => qb.whereILike('name', like).orWhereILike('email', like))
            }
            if (status !== undefined) query.where('enabled', status === 'enabled')

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
    async store(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'providers', 'create')

        const { request, response, auth, i18n } = ctx
        const data = await request.validateUsing(providerStoreValidator)
        const dateTime = DateTime.local()

        try {
            const provider = await Provider.create({
                ...data,
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
    async update(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'providers', 'update')

        const { params, request, response, auth, i18n } = ctx
        const data = await request.validateUsing(providerUpdateValidator)
        const dateTime = DateTime.local()

        try {
            const provider = await Provider.findOrFail(params.id)
            provider.merge({
                ...data,
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

    /** Show single provider */
    async show(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'providers', 'view')

        const { params } = ctx
        const provider = await Provider.findOrFail(params.id)
        await provider.load('city', (b) => b.select('id', 'name'))
        return provider
    }

    /** Store provider product */
    async storeProduct(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'providers', 'create')

        const { request, response, auth, i18n } = ctx
        const { name, code, price, providerId } = await request.validateUsing(
            vine.compile(
                vine.object({
                    providerId: vine.number().positive(),
                    name: vine.string().trim().minLength(1),
                    code: vine.string().trim().minLength(1),
                    price: vine.number().positive(),
                })
            )
        )

        try {
            const exists = await ProviderProduct.query()
                .where('providerId', providerId)
                .where('code', code)
                .first()
            if (exists) {
                return response.status(422).json(
                    MessageFrontEnd('El codigo ingresado ya esta asignado', 'Error')
                )
            }

            const dateTime = DateTime.local()
            const product = await ProviderProduct.create({
                providerId,
                name,
                code,
                price,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            })

            return response.status(201).json({
                product,
                message: i18n.formatMessage('messages.store_ok'),
                title: i18n.formatMessage('messages.ok_title'),
            } as MessageFrontEndType)
        } catch (error) {
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.store_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }

    /** Update provider product */
    async updateProduct(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'providers', 'update')

        const { request, response, params, auth, i18n } = ctx
        const { name, code, price, providerId } = await request.validateUsing(
            vine.compile(
                vine.object({
                    providerId: vine.number().positive(),
                    name: vine.string().trim().minLength(1).optional(),
                    code: vine.string().trim().minLength(1).optional(),
                    price: vine.number().positive().optional(),
                })
            )
        )

        try {
            const product = await ProviderProduct.findOrFail(params.product_id)

            // If code is changing, ensure uniqueness within provider
            if (code && code !== product.code) {
                const exists = await ProviderProduct.query()
                    .where('providerId', providerId)
                    .where('code', code)
                    .first()
                if (exists) {
                    return response.status(422).json(
                        MessageFrontEnd('El codigo ingresado ya esta asignado', 'Error')
                    )
                }
            }

            const dateTime = DateTime.local()
            product.merge({ name, code, price, updatedById: auth.user!.id, updatedAt: dateTime })
            await product.save()

            return response.status(200).json({
                product,
                message: i18n.formatMessage('messages.update_ok'),
                title: i18n.formatMessage('messages.ok_title'),
            } as MessageFrontEndType)
        } catch (error) {
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }



    /** List products by provider (paginated) */
    async findProductsByProvider(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'providers', 'view')

        const { params, request, response, i18n } = ctx
        // Validate pagination from querystring
        const { page, perPage } = await request.validateUsing(
            vine.compile(
                vine.object({
                    page: vine.number().positive().optional(),
                    perPage: vine.number().positive().optional(),
                })
            )
        )

        // Validate required param provider_id
        const providerId = Number(params.provider_id)
        if (!params.provider_id || Number.isNaN(providerId) || providerId <= 0) {
            return response.status(422).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }

        const query = ProviderProduct.query()
            .where('providerId', providerId)
            .preload('provider', (b) => b.select('id', 'name'))

        const products = page ? await query.paginate(page, perPage ?? 10) : await query

        return response.ok(products)
    }

    /** Change provider status */
    async changeStatus(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'providers', 'update')

        const { params, response, auth, i18n } = ctx
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
    async changeStatusProduct(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'providers', 'update')

        const { params, response, auth, i18n } = ctx
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
    async findAutoComplete(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'providers', 'view')

        const { request } = ctx
        const { val } = request.only(['val'])
        return await ProviderRepository.findAutoComplete(val)
    }

    /** Autocomplete: Provider Products */
    async findProductAutoComplete(ctx: HttpContext) {
        // await PermissionService.requirePermission(ctx, 'providers', 'view')

        const { request } = ctx
        const { val, providerId } = await request.validateUsing(
            vine.compile(
                vine.object({
                    providerId: vine.number().positive(),
                    val: vine.string().trim().optional(),
                })
            )
        )
        const search = val ?? ''
        return await ProviderRepository.findProductAutoComplete(providerId, search)
    }

    /** Show single product */
    async showProduct(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'providers', 'view')

        const { params } = ctx
        return await ProviderProduct.findOrFail(params.product_id)
    }
}