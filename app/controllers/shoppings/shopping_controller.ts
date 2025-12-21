import BusinessUser from '#models/business/business_user'
import NotificationType from '#models/notifications/notification_type'
import Shopping from '#models/shoppings/shopping'
import ShoppingRepository from '#repositories/shoppings/shopping_repository'
import NotificationService from '#services/notification_service'
import PermissionService from '#services/permission_service'
import env from '#start/env'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import { searchWithStatusSchema } from '#validators/general'
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
import mail from '@adonisjs/mail/services/main'
import vine from '@vinejs/vine'
import { randomUUID } from 'crypto'
import { DateTime } from 'luxon'

type MessageFrontEndType = { message: string; title: string }

export default class ShoppingController {
    /** List shoppings with optional pagination and filtering */
    public async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'shopping', 'view')

        const { request } = ctx
        const { page, perPage, status, text, businessId, providerId, startDate, endDate, date } = await request.validateUsing(
            vine.compile(
                vine.object({
                    ...searchWithStatusSchema.getProperties(),
                    businessId: vine.number().positive().optional(),
                    providerId: vine.number().positive().optional(),
                })
            )
        )

        let query = Shopping.query()
            .preload('provider')
            .preload('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            .preload('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            .orderBy('created_at', 'desc')

        // Prefer explicit input; fall back to Business header
        const headerBusinessIdRaw = request.header('Business')
        const headerBusinessId = headerBusinessIdRaw ? Number(headerBusinessIdRaw) : undefined

        if (businessId) {
            query = query.where('business_id', businessId)
        } else if (headerBusinessId && !Number.isNaN(headerBusinessId) && headerBusinessId > 0) {
            query = query.where('business_id', headerBusinessId)
        }

        if (status !== undefined) {
            query = query.where('enabled', status === 'enabled')
        }

        if (providerId) {
            query = query.where('provider_id', providerId)
        }

        if (startDate || endDate) query.where((builder => {
            if (startDate) {
                const pStartDate = DateTime.fromJSDate(startDate).toSQLDate()!

                builder.whereRaw('DATE(created_at) >= ?', [pStartDate])
            }
            if (endDate) {
                const pEndDate = DateTime.fromJSDate(endDate).toSQLDate()!
                builder.whereRaw('DATE(created_at) <= ?', [pEndDate])
            }
        }))

        if (date) {
            const pDate = DateTime.fromJSDate(date).toSQLDate()!
            query = query.whereRaw('DATE(created_at) = ?', [pDate])
        }


        if (text) {
            // Search across shopping number, requestedBy, provider name, and cost center code/name
            query = query.where((qb) => {
                qb.whereRaw('nro LIKE ?', [`%${text}%`])
                    .orWhereRaw('requested_by LIKE ?', [`%${text}%`])
                    .orWhereHas('provider', (b) => b.whereRaw('name LIKE ?', [`%${text}%`]))
                    .orWhereHas('costCenter', (b) => b.whereRaw('name LIKE ?', [`%${text}%`])
                        .orWhereRaw('code LIKE ?', [`${text}%`]))
            })
        }

        const shoppings = page ? await query.paginate(page, perPage) : await query
        return shoppings
    }
    /** Store a new shopping (creates shopping and its products) */
    public async store(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'shopping', 'create')

        const { request, response, auth, i18n } = ctx
        const { businessId, currencySymbol, provider, products, costCenter, work, info, rounding } =
            await request.validateUsing(shoppingStoreValidator)

        const trx = await db.transaction()
        const dateTime = await Util.getDateTimes(request)

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
                    b.select(['id', 'personal_data_id', 'email', 'signature', 'signature_short', 'signature_thumb', 'signature_thumb_short'])
                    b.preload('personalData')
                    b.preload('employee', empQuery => {
                        empQuery.preload('business', business =>
                            business.preload('position')
                        )
                    })
                })
            }

            // Load provider and business data for email
            await shopping.load('provider', (q) => q.select(['name']))
            await shopping.load('business', (q) => q.select(['name']))
            await shopping.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            // Prepare email payload data
            const providerName = shopping.provider?.name || ''
            const createdByName = shopping.createdBy?.personalData ? `${shopping.createdBy.personalData.names} ${shopping.createdBy.personalData.lastNameP} ${shopping.createdBy.personalData.lastNameM}`.trim() : ''
            /*             const host = env.get('NODE_ENV') === 'development'
                            ? 'http://212.38.95.163/sigmig/'
                            : 'https://admin.serviciosgenessis.com/'
                        const shoppingUrl = host + `admin/shopping/${shopping.id}` */

            const createdEmailData = buildShoppingCreatedEmailData(i18n, shopping, {
                providerName,
                requestedByName: createdByName,
            })
            let err: any
            // Send email notification to super users
            try {
                await sendShoppingNotification(businessId, createdEmailData)
                // DB notification (in-app)
                const type = await NotificationType.findBy('code', 'shopping_created')
                await NotificationService.createAndDispatch({
                    typeId: type?.id,
                    businessId,
                    title: createdEmailData.subject,
                    body: createdEmailData.body,
                    payload: { shoppingId: shopping.id, nro: shopping.nro, businessId },
                    createdById: auth.user!.id,
                })
            } catch (emailError) {
                // Log email error but don't fail the shopping creation
                console.log('Error sending shopping creation notification email:', emailError)
                err = emailError
            }

            return response.status(201).json({
                shopping,
                emitErr: err,
                ...MessageFrontEnd(i18n.formatMessage('messages.store_ok'), i18n.formatMessage('messages.ok_title')),
            } as MessageFrontEndType)
        } catch (error) {
            await trx.rollback()
            console.error(error)
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.store_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    /** Update an existing shopping and its products */
    public async update(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'shopping', 'update')

        const { params, request, response, auth, i18n } = ctx
        const { shop_id } = await shoppingShopIdParamValidator.validate(params)
        const trx = await db.transaction()
        const dateTime = await Util.getDateTimes(request)

        try {
            const { provider, products, cost_center: costCenter, work, info, rounding } = request.all() as any
            const shop = await Shopping.findOrFail(shop_id)

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
            await trx.from('shopping_products').where('shopping_id', shop_id).delete()

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
            const updatedShop = await Shopping.findOrFail(shop_id)
            // Preload authorizer with personalData if authorizerId exists
            if (updatedShop.authorizerId) {
                await updatedShop.load('authorizer', (b) => {
                    b.select(['id', 'personal_data_id', 'email', 'signature', 'signature_short', 'signature_thumb', 'signature_thumb_short'])
                    b.preload('personalData')
                    b.preload('employee', empQuery => {
                        empQuery.preload('business', business =>
                            business.preload('position')
                        )
                    })
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
    public async authorizer(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'shopping', 'update')

        const { request, auth, response, i18n } = ctx
        const { id } = await request.validateUsing(vine.compile(vine.object({ id: vine.number().positive() })))
        const dateTime = await Util.getDateTimes(request)

        const authUser = auth.getUserOrFail()
        const shop = await Shopping.findOrFail(id)

        try {
            const isPAuthorizer = shop.authorizerId === auth.user!.id
            const isAdmin = authUser.isAdmin
            const activeBUsr = isPAuthorizer || isAdmin
                ? null
                : await authUser.related('businessUser').query().where('business_id', shop.businessId).first()


            if (isPAuthorizer || isAdmin || activeBUsr?.isSuper) {
                shop.isAuthorized = true
                shop.authorizerAt = dateTime
                await shop.save()

                // Load relationships for email notification
                await shop.load('business', (q) => q.select(['name']))
                await shop.load('provider', (q) => q.select(['name']))
                await shop.load('createdBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })
                await shop.load('authorizer', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id'])
                })

                // Prepare email data
                const providerName = shop.provider?.name || ''
                const authorizedByName = shop.authorizer?.personalData ? `${shop.authorizer.personalData.names} ${shop.authorizer.personalData.lastNameP} ${shop.authorizer.personalData.lastNameM}`.trim() : ''
                /*                 const host = env.get('NODE_ENV') === 'development'
                                    ? 'http://212.38.95.163/sigmig/'
                                    : 'https://admin.serviciosgenessis.com/'
                                const shoppingUrl = host + `admin/shopping/${shop.id}`
                 */
                const authorizedEmailData = buildShoppingAuthorizedEmailData(i18n, shop, {
                    providerName,
                    authorizedByName,
                })

                // Send email notification to the creator
                try {
                    if (shop.createdBy?.email) {
                        await mail.sendLater((message) => {
                            message
                                .to(shop.createdBy!.email)
                                .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
                                .subject(authorizedEmailData.subject)
                                .htmlView('emails/shopping_authorized', authorizedEmailData)
                        })
                    }
                } catch (emailError) {
                    // Log email error but don't fail the authorization
                    console.log('Error sending shopping authorization notification email:', emailError)
                }

                // In-app notification for authorization
                try {
                    const type = await NotificationType.findBy('code', 'shopping_authorized')
                    await NotificationService.createAndDispatch({
                        typeId: type?.id,
                        businessId: shop.businessId,
                        title: authorizedEmailData.subject,
                        body: authorizedEmailData.body,
                        payload: { shoppingId: shop.id, nro: shop.nro, authorizedById: shop.authorizerId, businessId: shop.businessId },
                        createdById: auth.user!.id,
                    })
                } catch (notifyErr) {
                    console.log('Shopping authorization notification error:', notifyErr)
                }

                return response.status(201).json(MessageFrontEnd(i18n.formatMessage('messages.authorizer_ok'), i18n.formatMessage('messages.ok_title')))
            }
            else
                return response.status(403)
                    .json({
                        isAdmin: authUser.isAdmin,
                        canAuthorize: shop.authorizerId === authUser.id,
                        ...MessageFrontEnd(
                            i18n.formatMessage('messages.no_authorizer_permission'),
                            i18n.formatMessage('messages.error_title')
                        )
                    })
        } catch (error) {
            console.error(error)
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.authorizer_error'), i18n.formatMessage('messages.error_title')))
        }
    }


    /** Find shopping by business and number */
    public async findByNro(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'shopping', 'view')

        const { request } = ctx
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
    public async show(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'shopping', 'view')

        const { params } = ctx
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
                b.select(['id', 'personal_data_id', 'email', 'signature', 'signature_short', 'signature_thumb', 'signature_thumb_short'])
                b.preload('personalData')
                b.preload('employee', empQuery => {
                    empQuery.preload('business', business =>
                        business.preload('position')
                    )
                })
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
                    ; (p as any).total = Util.truncateToTwoDecimals(importe * tax + importe)
            }
        }
        return serialized
    }

    /** Soft-delete a shopping (mark disabled) */
    public async delete(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'shopping', 'delete')

        const { params, request, auth, response, i18n } = ctx
        const { shop_id } = await shoppingShopIdParamValidator.validate(params)
        const dateTime = await Util.getDateTimes(request)
        try {
            const shop = await Shopping.findOrFail(shop_id)
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
    public async findByNameProvider(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'shopping', 'view')

        const { request } = ctx
        const { businessId, name } = await request.validateUsing(shoppingFindByNameProviderValidator)
        const shoppings = await ShoppingRepository.findByNameProvider(businessId, name)
        return shoppings
    }

    /** Find shoppings by date */
    public async findByDate(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'shopping', 'view')

        const { request } = ctx
        const { businessId, date } = await request.validateUsing(shoppingFindByDateValidator)
        const shoppings = await ShoppingRepository.findByDate(businessId, date)
        return shoppings
    }

    /** Update shopping's nro_buget */
    public async updateNroBuget(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'shopping', 'update')

        const { params, request, response, i18n } = ctx
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
    public async showByToken(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'shopping', 'view')

        const { params } = ctx
        const { token } = await shoppingTokenParamValidator.validate(params)
        const shop = await Shopping.findBy('token', token)
        if (!shop) return null
        await shop.load('business', (builder) => {
            builder.select(['id', 'name', 'url', 'email', 'identify', 'address', 'phone', 'days_expire_buget', 'type_identify_id', 'footer'])
            builder.preload('typeIdentify', (b) => b.select(['text', 'id']))
        })

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
                b.select(['id', 'personal_data_id', 'email', 'signature', 'signature_short', 'signature_thumb', 'signature_thumb_short'])
                b.preload('personalData')
                b.preload('employee', empQuery => {
                    empQuery.preload('business', business =>
                        business.preload('position')
                    )
                })
            })
        }

        // Convert to plain object and post-process


        // serialize and compute product totals (price * count + tax)
        const serialized: any = shop.toJSON()
        // serialized.authorizer = authorizer?.serialize()
        if (Array.isArray(serialized.products)) {
            for (const p of serialized.products) {
                const subtotal = Number(p.price) * Number(p.count)
                const tax = Number(p.tax) / 100
                p.total = Util.truncateToTwoDecimals(subtotal * tax + subtotal)
            }
        }
        return serialized
    }

    /** Share shopping via event */
    public async share(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'shopping', 'view')

        const { params, response, i18n } = ctx
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


export async function sendShoppingNotification(businessId: number, emailData: {
    subject: string
    body: string
    shoppingNumber: string
    providerName: string
    expirationDate: string
    requestedBy: string
    shoppingUrl?: string
    businessName: string
    shoppingNumberLabel: string
    providerLabel: string
    expirationDateLabel: string
    requestedByLabel: string
    viewShoppingLabel: string
    backupText: string
}, template: string = 'emails/shopping_created') {
    const superUsers = await BusinessUser.query()
        .where('business_id', businessId)
        .where('is_super', true)
        .preload('user', (userQuery) => {
            userQuery.select(['personal_data_id', 'id', 'email'])
            userQuery.preload('personalData', (pdQ) => pdQ.select(['id', 'names', 'last_name_p', 'last_name_m']))
        })

    if (superUsers.length > 0) {
        // Send email to each super user
        for (const businessUser of superUsers) {
            if (businessUser.user?.email) {
                await mail.send((message) => {
                    message
                        .to(businessUser.user!.email)
                        .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
                        .subject(emailData.subject)
                        .htmlView(template, emailData)
                })
            }
        }
    }
}

// Helper: compose email data for shopping creation, mirroring budget flow
function buildShoppingCreatedEmailData(i18n: HttpContext['i18n'], shopping: Shopping, opts: {
    providerName: string
    requestedByName: string
}) {
    const expirationDateStr = shopping.expireDate ? Util.parseToMoment(shopping.expireDate, false, { separator: '/', firstYear: false }) : ''
    const subject = i18n.formatMessage('messages.shopping_created_email_subject', { shoppingNumber: shopping.nro })
    const body = i18n.formatMessage('messages.shopping_created_email_body', {
        shoppingNumber: shopping.nro,
        providerName: opts.providerName,
        expirationDate: expirationDateStr,
        requestedBy: opts.requestedByName,
    })
    return {
        subject,
        body,
        shoppingNumber: shopping.nro,
        providerName: opts.providerName,
        expirationDate: expirationDateStr,
        requestedBy: opts.requestedByName,
        businessName: shopping.business?.name || '',
        shoppingNumberLabel: i18n.formatMessage('messages.shopping_number'),
        providerLabel: i18n.formatMessage('messages.provider'),
        expirationDateLabel: i18n.formatMessage('messages.expiration_date'),
        requestedByLabel: i18n.formatMessage('messages.requested_by'),
        viewShoppingLabel: i18n.formatMessage('messages.view_shopping'),
        backupText: i18n.formatMessage('messages.shopping_created_backup_text'),
    }
}

// Helper: compose email data for shopping authorization, mirroring budget flow
function buildShoppingAuthorizedEmailData(i18n: HttpContext['i18n'], shop: Shopping, opts: {
    providerName: string
    authorizedByName: string
}) {
    const authorizationDateStr = shop.authorizerAt ? Util.parseToMoment(shop.authorizerAt, false, { separator: '/', firstYear: false }) : ''
    const subject = i18n.formatMessage('messages.shopping_authorized_email_subject', { shoppingNumber: shop.nro })
    const body = i18n.formatMessage('messages.shopping_authorized_email_body', {
        shoppingNumber: shop.nro,
        providerName: opts.providerName,
        authorizationDate: authorizationDateStr,
        authorizedBy: opts.authorizedByName,
    })
    return {
        subject,
        body,
        shoppingNumber: shop.nro,
        providerName: opts.providerName,
        authorizationDate: authorizationDateStr,
        authorizedBy: opts.authorizedByName,
        businessName: shop.business?.name || '',
        shoppingNumberLabel: i18n.formatMessage('messages.shopping_number'),
        providerLabel: i18n.formatMessage('messages.provider'),
        authorizationDateLabel: i18n.formatMessage('messages.authorization_date'),
        authorizedByLabel: i18n.formatMessage('messages.authorized_by'),
        viewShoppingLabel: i18n.formatMessage('messages.view_authorized_shopping'),
        backupText: i18n.formatMessage('messages.shopping_authorized_backup_text'),
    }
}
