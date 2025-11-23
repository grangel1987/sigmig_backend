import BusinessEmployee from '#models/business/business_employee'
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
        const { businessId, currencySymbol, provider, products, costCenter, work, info, rounding } =
            await request.validateUsing(shoppingStoreValidator)

        const trx = await db.transaction()
        const dateTime = await Util.getDateTimes(request.ip())

        try {
            const lastShop = await db.from('shoppings')
                .where('business_id', businessId)
                .orderBy('id', 'desc')
                .limit(1)

            const nro = lastShop.length > 0 ? Number(lastShop[0].nro) + 1 : 1

            const payload: any = {
                nro: String(nro),
                businessId,
                currencySymbol,
                providerId: provider.id,
                costCenterId: costCenter,
                workId: work,
                rounding,
                requestedBy: info.name,
                paymentTermId: info.paymentTerm,
                sendConditionId: info.sendCondition,
                sendAmount: info.sendAmount,
                otherAmount: info.otherAmount,
                observation: info.observation,
                createdAt: dateTime,
                updatedAt: dateTime,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                expireDate: Util.getDateAddDays(dateTime, info.daysExpireBuget ?? 0),
                authorizerId: info.authorizerId,
                nroBuget: info.nroBuget,
                token: randomUUID(),
            }

            const shopping = await Shopping.create(payload, { client: trx })

            // normalize products to match DB schema (shopping_products): product_id, code, name, price, count, tax
            const productsRows = products!.map((p) => {
                const productId = Number(p.id)
                const code = p.code ?? ''
                const name = p.name ?? ''
                const price = p.price ?? 0
                const count = p.count ?? 0
                const tax = p.tax ?? 0
                return { productId, code, name, price, count, tax }
            })

            if (productsRows.length) {
                await shopping.related('products').createMany(productsRows, { client: trx })
            }

            await trx.commit()

            // Preload authorizer with personalData if authorizerId exists
            if (shopping.authorizerId) {
                await shopping.load('authorizer', (b) => {
                    b.select(['id', 'personal_data_id', 'email'])
                    b.preload('personalData')
                })
            }

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
        const { shopId } = await shoppingShopIdParamValidator.validate(params)
        const trx = await db.transaction()
        const dateTime = await Util.getDateTimes(request.ip())

        try {
            const { provider, products, cost_center: costCenter, work, info, rounding } = request.all() as any
            const shop = await Shopping.findOrFail(shopId)

            shop.costCenterId = costCenter ?? null
            shop.workId = work ?? null
            shop.requestedBy = info?.name ?? shop.requestedBy
            shop.nroBuget = info?.nroBuget ?? shop.nroBuget
            shop.authorizerId = shop.isAuthorized ? shop.authorizerId : (info?.authorizerId ?? shop.authorizerId)
            shop.paymentTermId = info?.paymentTerm ?? shop.paymentTermId
            shop.sendConditionId = info?.sendCondition ?? shop.sendConditionId
            shop.sendAmount = info?.sendAmount ?? shop.sendAmount
            shop.otherAmount = info?.otherAmount ?? shop.otherAmount
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

            // Reload the shopping with preloads
            const updatedShop = await Shopping.findOrFail(shopId)
            // Preload authorizer with personalData if authorizerId exists
            if (updatedShop.authorizerId) {
                await updatedShop.load('authorizer', (b) => {
                    b.select(['id', 'personal_data_id', 'email'])
                    b.preload('personalData')
                })
            }

            return response.status(201).json({
                shopping: updatedShop,
                ...MessageFrontEnd(i18n.formatMessage('messages.update_ok'), i18n.formatMessage('messages.ok_title'))
            })
        } catch (error) {
            await trx.rollback()
            console.error(error)
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.update_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    /** Mark shopping as authorized by current user */
    public async authorizer({ request, auth, response, i18n }: HttpContext) {
        const { id } = await request.validateUsing(vine.compile(vine.object({ id: vine.number().positive() })))
        const dateTime = await Util.getDateTimes('')

        const authUser = auth.getUserOrFail()
        const shop = await Shopping.findOrFail(id)
        if (!authUser.isAuthorizer || shop.authorizerId !== authUser.id)
            return response.status(403)
                .json(MessageFrontEnd(
                    i18n.formatMessage('messages.no_authorizer_permission'),
                    i18n.formatMessage('messages.error_title')
                ))
        try {


            shop.isAuthorized = true
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
        const { businessId, number } = await request.validateUsing(
            vine.compile(
                vine.object({
                    businessId: vine.number().positive(),
                    number: vine.string(),
                })
            )
        )

        // find id by business + number (nro)
        const rows = await db.from('shoppings').where('business_id', businessId).where('nro', String(number)).limit(1)
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
        let shop = await Shopping.find(shopId)
        if (!shop) return null

        // Deep preloads with selects and nested relations
        await shop.load('business', (builder) => {
            builder.select(['id', 'name', 'url', 'email', 'identify', 'address', 'phone', 'days_expire_buget', 'type_identify_id', 'footer'])
            builder.preload('typeIdentify', (b) => b.select(['text', 'id']))
        })
        await shop.load('provider', (builder) => {
            builder.select(['id', 'name', 'email', 'address', 'city_id', 'phone'])
            builder.preload('city', (b) => b.select(['id', 'name']))
        })

        await shop.load('products')
        await shop.load('costCenter', (b) => b.select(['id', 'code', 'name']))
        await shop.load('work', (b) => b.select(['id', 'code', 'name']))

        await shop.load('createdBy', (b) => {
            b.select(['id', 'personal_data_id', 'email'])
            b.preload('personalData')
        })
        await shop.load('updatedBy', (b) => {
            b.select(['id', 'personal_data_id', 'email'])
            b.preload('personalData')
        })
        await shop.load('deletedBy', (b) => {
            b.select(['id', 'personal_data_id', 'email'])
            b.preload('personalData')
        })
        await shop.load('paymentTerm', (b) => b.select(['id', 'text']))
        await shop.load('sendCondition', (b) => b.select(['id', 'text']))

        // Preload authorizer with personalData if authorizerId exists
        if (shop.authorizerId) {
            await shop.load('authorizer', (b) => {
                b.select(['id', 'personal_data_id', 'email'])
                b.preload('personalData')
            })
        }

        /*         const authorizer = await
                    BusinessEmployee.query()
                        .join('employees', 'employees.id',
                            'business_employees.employee_id'
                        )
                        .select([
                            'business_employees.id as id',
                            'employees.last_name_p',
                            'employees.names',
                            'employees.last_name_m',
                            'business_employees.position_id',
                        ])
                        .preload('position', (b) => b.select(['id', 'name'])).first() */


        // Convert to plain object and post-process
        const serialized: any = shop.toJSON()
        // serialized.authorizer = authorizer?.serialize()


        if (Array.isArray(serialized.products)) {
            for (const p of serialized.products) {
                const importe = Number(p.price) * Number(p.count)
                const tax = Number(p.tax) / 100
                    ; (p as any).total = importe * tax + importe
            }
        }
        return serialized
    }

    /** Soft-delete a shopping (mark disabled) */
    public async delete({ params, auth, response, i18n }: HttpContext) {
        const { shopId } = await shoppingShopIdParamValidator.validate(params)
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
        const { businessId, name } = await request.validateUsing(shoppingFindByNameProviderValidator)
        const shoppings = await ShoppingRepository.findByNameProvider(businessId, name)
        return shoppings
    }

    /** Find shoppings by date */
    public async findByDate({ request }: HttpContext) {
        const { businessId, date } = await request.validateUsing(shoppingFindByDateValidator)
        const shoppings = await ShoppingRepository.findByDate(businessId, date)
        return shoppings
    }

    /** Update shopping's nro_buget */
    public async updateNroBuget({ params, request, response, i18n }: HttpContext) {
        const dateTime = DateTime.local()
        const { id: shopId } = await shoppingIdParamValidator.validate(params)
        const { nroBuget } = await request.validateUsing(shoppingUpdateNroBugetValidator)
        try {
            const shop = await Shopping.findOrFail(shopId)
            shop.nroBuget = nroBuget
            shop.updatedAt = dateTime
            await shop.save()
            return response.status(201).json(MessageFrontEnd(i18n.formatMessage('messages.update_ok'), i18n.formatMessage('messages.ok_title')))
        } catch (error) {
            console.error(error)
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.update_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    /** Show by token (used for sharing) */
    public async showByToken({ params }: HttpContext) {
        const { token } = await shoppingTokenParamValidator.validate(params)
        const shop = await Shopping.findBy('token', token)
        if (!shop) return null
        await shop.load('business')

        await shop.load('paymentTerm', (b) => b.select(['id', 'text']))
        await shop.load('sendCondition', (b) => b.select(['id', 'text']))
        await shop.load('products')
        await shop.load('costCenter')
        await shop.load('work')
        await shop.load('createdBy', (b) => {
            b.select(['id', 'email'])
            b.preload('personalData')
        })
        await shop.load('updatedBy', (b) => {
            b.select(['id', 'email'])
            b.preload('personalData')
        })
        await shop.load('deletedBy', (b) => {
            b.select(['id', 'email'])
            b.preload('personalData')
        })

        // Preload authorizer with personalData if authorizerId exists
        if (shop.authorizerId) {
            await shop.load('authorizer', (b) => {
                b.select(['id', 'personal_data_id', 'email'])
                b.preload('personalData')
            })
        }

        const authorizer = await
            BusinessEmployee.query()
                .join('employees', 'employees.id',
                    'business_employees.employee_id'
                )
                .select([
                    'business_employees.id as id',
                    'employees.last_name_p',
                    'employees.names',
                    'employees.last_name_m',
                    'business_employees.position_id',
                ])
                .preload('position', (b) => b.select(['id', 'name'])).first()


        // Convert to plain object and post-process


        // serialize and compute product totals (price * count + tax)
        const serialized: any = shop.toJSON()
        // serialized.authorizer = authorizer?.serialize()
        if (Array.isArray(serialized.products)) {
            for (const p of serialized.products) {
                const subtotal = Number(p.price) * Number(p.count)
                const tax = Number(p.tax) / 100
                p.total = subtotal * tax + subtotal
            }
        }
        return serialized
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
