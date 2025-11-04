import Shopping from '#models/shoppings/shopping'
import ShoppingRepository from '#repositories/shoppings/shopping_repository'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import {
    shoppingFindByDateValidator,
    shoppingFindByNameProviderValidator,
    shoppingIdParamValidator,
    shoppingShopIdParamValidator,
    shoppingStoreValidator,
    shoppingTokenParamValidator,
    shoppingUpdateNroBugetValidator,
} from '#validators/shopping'
import { HttpContext } from '@adonisjs/core/http'
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { randomUUID } from 'crypto'
import { DateTime } from 'luxon'

type MessageFrontEndType = { message: string; title: string }

export default class ShoppingController {
    /** Store a new shopping (creates shopping and its products) */
    public async store({ request, response, auth, i18n }: HttpContext) {
        const { business_id, currency_symbol, provider, products, cost_center, work, info, rounding } =
            await request.validateUsing(shoppingStoreValidator)

        const trx = await db.transaction()
        const dateTime = await Util.getDateTimes(request.ip())

        try {
            const lastShop = await db.from('shoppings')
                .where('business_id', business_id)
                .orderBy('id', 'desc')
                .limit(1)

            const nro = lastShop.length > 0 ? Number(lastShop[0].nro) + 1 : 1

            const payload: any = {
                nro: String(nro),
                businessId: business_id,
                currencySymbol: currency_symbol,
                providerId: provider.id,
                costCenterId: cost_center,
                workId: work,
                rounding,
                requestedBy: info.name,
                paymentTermId: info.payment_term,
                sendConditionId: info.send_condition,
                sendAmount: info.send_amount,
                otherAmount: info.other_amount,
                observation: info.observation,
                createdAt: dateTime,
                updatedAt: dateTime,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                expireDate: Util.getDateAddDays(dateTime, info.days_expire_buget ?? 0),
                authorizerId: info.authorizer_id,
                nroBuget: info.nro_buget,
                token: randomUUID(),
            }

            const shopping = await Shopping.create(payload, { client: trx })

            // normalize products to match DB schema (shopping_products): product_id, code, name, price, count, tax
            const productsRows = (products || []).map((p: any) => {
                const productId = Number(p.id)
                const code = p.code ?? ''
                const name = p.name ?? ''
                const price = Number(p.price ?? 0)
                const count = Number(p.count ?? p.quantity ?? 0)
                const tax = Number(p.tax ?? 0)
                return { productId, code, name, price, count, tax }
            })

            if (productsRows.length) {
                await shopping.related('products').createMany(productsRows, { client: trx })
            }

            await trx.commit()

            return response.status(201).json({
                shopping,
                ...MessageFrontEnd(i18n.formatMessage('messages.store_ok'), i18n.formatMessage('messages.ok_title')),
            } as MessageFrontEndType)
        } catch (error) {
            await trx.rollback()
            console.error(error)
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.store_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    /** Update an existing shopping and its products */
    public async update({ params, request, response, auth, i18n }: HttpContext) {
        const { shop_id: shopId } = await shoppingShopIdParamValidator.validate(params)
        const trx = await db.transaction()
        const dateTime = await Util.getDateTimes(request.ip())

        try {
            const { provider, products, cost_center, work, info, rounding } = request.all() as any
            const shop = await Shopping.findOrFail(shopId)

            shop.costCenterId = cost_center ?? null
            shop.workId = work ?? null
            shop.requestedBy = info?.name ?? shop.requestedBy
            shop.nroBuget = info?.nro_buget ?? shop.nroBuget
            shop.authorizerId = shop.isAuthorized ? shop.authorizerId : (info?.authorizer_id ?? shop.authorizerId)
            shop.paymentTermId = info?.payment_term ?? shop.paymentTermId
            shop.sendConditionId = info?.send_condition ?? shop.sendConditionId
            shop.sendAmount = info?.send_amount ?? shop.sendAmount
            shop.otherAmount = info?.other_amount ?? shop.otherAmount
            shop.observation = info?.observation ?? shop.observation
            shop.providerId = provider?.id ?? shop.providerId
            shop.rounding = rounding ?? shop.rounding
            shop.updatedAt = dateTime
            shop.updatedById = auth.user!.id

            await shop.useTransaction(trx).save()

            // Remove old products and insert new ones
            await trx.from('shopping_products').where('shopping_id', shopId).delete()

            const productsRows = (products || []).map((p: any) => {
                const productId = Number(p.id)
                const code = p.code ?? ''
                const name = p.name ?? ''
                const price = Number(p.price ?? 0)
                const count = Number(p.count ?? p.quantity ?? 0)
                const tax = Number(p.tax ?? 0)
                return { productId, code, name, price, count, tax }
            })

            if (productsRows.length) {
                await shop.related('products').createMany(productsRows, { client: trx })
            }

            await trx.commit()
            return response.status(201).json(MessageFrontEnd(i18n.formatMessage('messages.update_ok'), i18n.formatMessage('messages.ok_title')))
        } catch (error) {
            await trx.rollback()
            console.error(error)
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.udpate_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    /** Mark shopping as authorized by current user */
    public async authorizer({ request, auth, response, i18n }: HttpContext) {
        const { id } = await request.validateUsing(vine.compile(vine.object({ id: vine.number().positive() })))
        const dateTime = await Util.getDateTimes('')
        try {
            const shop = await Shopping.findOrFail(id)
            shop.isAuthorized = true
            shop.authorizerId = auth.user!.id
            shop.authorizerAt = dateTime
            await shop.save()
            return response.status(201).json(MessageFrontEnd(i18n.formatMessage('messages.authorizer_ok'), i18n.formatMessage('messages.ok_title')))
        } catch (error) {
            console.error(error)
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.authorizer_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    /** Find shopping by business and number */
    public async findByNro({ request }: HttpContext) {
        const { business_id, number } = await request.validateUsing(
            vine.compile(
                vine.object({
                    business_id: vine.number().positive(),
                    number: vine.string(),
                })
            )
        )

        // find id by business + number (nro)
        const rows = await db.from('shoppings').where('business_id', business_id).where('nro', String(number)).limit(1)
        const shopId = rows.length > 0 ? rows[0].id : 0
        if (!shopId) return []

        const shop = await Shopping.find(shopId)
        if (!shop) return []

        await shop.load('provider', (b) => b.select(['id', 'name', 'email', 'address', 'city_id', 'phone']))
        await shop.load('costCenter', (b) => b.select(['id', 'code', 'name']))
        await shop.load('work', (b) => b.select(['id', 'code', 'name']))

        return [shop]
    }

    /** Show a shopping by id with preloads */
    public async show({ params }: HttpContext) {
        const shopId = params.id
        const shop = await Shopping.find(shopId)
        if (!shop) return null

        await shop.load('business', (b) => b.select(['id', 'name', 'url', 'email', 'identify', 'address', 'phone', 'days_expire_buget', 'type_identify_id', 'footer']))
        await shop.load('provider', (b) => b.select(['id', 'name', 'email', 'address', 'city_id', 'phone']))
        await shop.load('products')
        await shop.load('costCenter', (b) => b.select(['id', 'code', 'name']))
        await shop.load('work', (b) => b.select(['id', 'code', 'name']))
        await shop.load('createdBy')
        await shop.load('updatedBy')
        await shop.load('deletedBy')

        return shop
    }

    /** Soft-delete a shopping (mark disabled) */
    public async delete({ params, auth, response, i18n }: HttpContext) {
        const { shop_id: shopId } = await shoppingShopIdParamValidator.validate(params)
        const dateTime = await Util.getDateTimes('')
        try {
            const shop = await Shopping.findOrFail(shopId)
            shop.enabled = false
            shop.deletedAt = dateTime
            shop.deletedById = auth.user!.id
            await shop.save()
            return response.status(201).json(MessageFrontEnd(i18n.formatMessage('messages.delete_ok'), i18n.formatMessage('messages.ok_title')))
        } catch (error) {
            console.error(error)
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.delete_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    /** Find shoppings by provider name (uses repository) */
    public async findByNameProvider({ request }: HttpContext) {
        const { business_id, name } = await request.validateUsing(shoppingFindByNameProviderValidator)
        const shoppings = await ShoppingRepository.findByNameProvider(business_id, name)
        return shoppings
    }

    /** Find shoppings by date */
    public async findByDate({ request }: HttpContext) {
        const { business_id, date } = await request.validateUsing(shoppingFindByDateValidator)
        const shoppings = await ShoppingRepository.findByDate(business_id, date)
        return shoppings
    }

    /** Update shopping's nro_buget */
    public async updateNroBuget({ params, request, response, i18n }: HttpContext) {
        const dateTime = DateTime.local()
        const { id: shopId } = await shoppingIdParamValidator.validate(params)
        const { nro_buget } = await request.validateUsing(shoppingUpdateNroBugetValidator)
        try {
            const shop = await Shopping.findOrFail(shopId)
            shop.nroBuget = nro_buget
            shop.updatedAt = dateTime
            await shop.save()
            return response.status(201).json(MessageFrontEnd(i18n.formatMessage('messages.update_ok'), i18n.formatMessage('messages.ok_title')))
        } catch (error) {
            console.error(error)
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.udpate_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    /** Show by token (used for sharing) */
    public async showByToken({ params }: HttpContext) {
        const { token } = await shoppingTokenParamValidator.validate(params)
        const shop = await Shopping.findBy('token', token)
        if (!shop) return null
        await shop.load('business')
        await shop.load('provider')
        await shop.load('products')
        await shop.load('costCenter')
        await shop.load('work')
        await shop.load('createdBy')
        await shop.load('updatedBy')
        await shop.load('deletedBy')
        return shop
    }

    /** Share shopping via event */
    public async share({ params, response, i18n }: HttpContext) {
        const { id: shopId } = await shoppingIdParamValidator.validate(params)
        try {
            const shop = await Shopping.query().where('id', shopId).preload('provider').firstOrFail()
            const payloadEmail = {
                email: shop.provider.email ?? '',
                full_name: shop.provider.name,
                token: shop.token ?? '',
            }
            await emitter.emit('new::shoppingShare', payloadEmail)
            return response.status(201).json(MessageFrontEnd(i18n.formatMessage('messages.email_send_ok'), i18n.formatMessage('messages.ok_title')))
        } catch (error) {
            console.error(error)
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.email_send_error'), i18n.formatMessage('messages.error_title')))
        }
    }
}
