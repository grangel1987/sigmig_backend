import BudgetPayment from '#models/budget_payment'
import Buget from '#models/bugets/buget'
import Business from '#models/business/business'
import BusinessUser from '#models/business/business_user'
import City from '#models/cities/City'
import Client from '#models/clients/client'
import Coin from '#models/coin/coin'
import NotificationType from '#models/notifications/notification_type'
import Product from '#models/products/product'
import Provider from '#models/provider/provider'
import ProviderProduct from '#models/provider/provider_product'
import ServiceEntrySheet from '#models/service_entry_sheets/service_entry_sheet'
import Shopping from '#models/shoppings/shopping'
import NotificationService from '#services/notification_service'
import PermissionService from '#services/permission_service'
import env from '#start/env'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import { log } from 'node:console'

export default class ServiceEntrySheetController {
  public async products(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'service_entry_sheets', 'view')

    const { request, response, i18n } = ctx
    const { from, providerId, text } = await request.validateUsing(
      vine.compile(
        vine.object({
          from: vine.enum(['provider', 'business']),
          providerId: vine.number().positive().optional().requiredWhen('from', '=', 'provider'),
          text: vine.string().trim().optional(),
        })
      )
    )

    if (from === 'provider') {
      const provider = await Provider.find(providerId!)
      if (!provider) {
        return response
          .status(404)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.no_exist', {}, 'Proveedor no existe'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      const productQ = ProviderProduct.query()
        .select(['id', 'code', 'name', 'price as amount'])
        .orderBy('name', 'asc')
        .where('provider_id', providerId!)
        .where('enabled', true)
        .limit(100)

      if (text) {
        productQ.where((pQb) => {
          pQb.whereRaw('name LIKE ?', [`%${text}%`]).orWhereRaw('code LIKE ?', [`%${text}%`])
        })
      }

      const products = await productQ

      return response.status(200).json(products)
    }

    const businessId = Number(request.header('Business'))
    if (!Number.isFinite(businessId) || businessId <= 0) {
      return response
        .status(400)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.invalid_format', {}, 'Empresa invalida'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    const bProductQ = Product.query()
      .where('business_id', businessId)
      .where('enabled', true)
      .select(['id', 'name', 'amount'])
      .orderBy('name', 'asc')
      .limit(100)

    if (text) {
      bProductQ.whereRaw('name LIKE ?', [`%${text}%`])
    }

    const products = await bProductQ

    return response.status(200).json(products)
  }

  public async index(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'service_entry_sheets', 'view')

    const { request, response, i18n } = ctx
    const { clientId, providerId, concept, page, perPage, startDate, endDate, status } =
      request.qs()

    const businessId = Number(request.header('Business'))
    if (!Number.isFinite(businessId) || businessId <= 0) {
      return response
        .status(400)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.invalid_format', {}, 'Empresa invalida'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    const fromDate = typeof startDate === 'string' ? parseDate(startDate) : null
    const toDate = typeof endDate === 'string' ? parseDate(endDate) : null

    if ((fromDate && !fromDate.isValid) || (toDate && !toDate.isValid)) {
      return response
        .status(422)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.invalid_format', {}, 'Formato de fecha invalido'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    const query = ServiceEntrySheet.query()
      .preload('client', (q) => q.select(['id', 'name', 'identify', 'identify_type_id', 'phone']))
      .preload('provider', (q) => q.select(['id', 'name', 'phone']))
      .where('business_id', businessId)

    if (status === 'disabled') {
      query.where('enabled', false)
    } else if (status !== 'all') {
      query.where('enabled', true)
    }

    if (clientId) {
      query.where('client_id', Number(clientId))
    }

    if (providerId) {
      query.where('provider_id', Number(providerId))
    }

    if (typeof concept === 'string' && concept.trim()) {
      const term = concept.trim()
      query.where((builder) => {
        builder
          .where('document_title', 'like', `%${term}%`)
          .orWhere('service_name', 'like', `%${term}%`)
      })
    }

    if (fromDate) {
      query.where('issue_date', '>=', fromDate.toISODate())
    }

    if (toDate) {
      query.where('issue_date', '<=', toDate.toISODate())
    }

    const pageNumber = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1
    const perPageNumber =
      Number.isFinite(Number(perPage)) && Number(perPage) > 0 ? Number(perPage) : 25

    const sheets = await query.orderBy('id', 'desc').paginate(pageNumber, perPageNumber)

    return response.status(200).json(sheets)
  }

  public async store(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'service_entry_sheets', 'create')

    const { request, response, i18n, auth } = ctx

    const businessId = Number(request.header('Business'))
    if (!Number.isFinite(businessId) || businessId <= 0) {
      return response
        .status(400)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.invalid_format', {}, 'Empresa invalida'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    const payload = await request.validateUsing(serviceEntrySheetStoreValidator)

    const issueDate = parseDate(payload.issueDate)

    if (!issueDate.isValid) {
      return response
        .status(422)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.invalid_format', {}, 'Formato de fecha invalido'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    let resolvedClientId = payload.clientId ?? null
    let resolvedClient: Client | null = null

    if (payload.budgetPaymentId) {
      const budgetPayment = await BudgetPayment.find(payload.budgetPaymentId)
      if (!budgetPayment) {
        return response
          .status(404)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.no_exist', {}, 'Pago de presupuesto no existe'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      const budget = await Buget.find(budgetPayment.budgetId)
      if (!budget) {
        return response
          .status(404)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.no_exist', {}, 'Presupuesto no existe'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      if (!resolvedClientId) {
        resolvedClientId = budget.clientId ?? null
      }
    }

    if (resolvedClientId) {
      resolvedClient = await Client.find(resolvedClientId)
      if (!resolvedClient) {
        return response
          .status(404)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.no_exist', {}, 'Cliente no existe'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }
    }
    const business = await Business.find(businessId)
    if (!business) {
      return response
        .status(404)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.no_exist', {}, 'Empresa no existe'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    if (payload.issuerClientId) {
      const issuerClient = await Client.find(payload.issuerClientId)
      if (!issuerClient) {
        return response
          .status(404)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.no_exist', {}, 'Emisor no existe'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }
    }

    let purchaseOrderNumber = payload.purchaseOrderNumber?.trim() || null
    let purchaseOrderDate: DateTime | null = null
    let providerId = payload.providerId ?? null

    if (purchaseOrderNumber) {
      const shopping = await Shopping.query()
        .where('business_id', businessId)
        .where('nro', purchaseOrderNumber)
        .first()

      if (!shopping) {
        return response
          .status(404)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.no_exist', {}, 'Orden de compra no existe'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      purchaseOrderNumber = shopping.nro
      purchaseOrderDate = shopping.createdAt ?? null

      if (!providerId) {
        providerId = shopping.providerId ?? null
      }
    } else if (payload.purchaseOrderDate) {
      const parsedPurchaseOrderDate = parseDate(payload.purchaseOrderDate)
      if (!parsedPurchaseOrderDate.isValid) {
        return response
          .status(422)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.invalid_format', {}, 'Formato de fecha invalido'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }
      purchaseOrderDate = parsedPurchaseOrderDate
    }

    let provider: Provider | null = null
    if (providerId) {
      provider = await Provider.find(providerId)
      if (!provider) {
        return response
          .status(404)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.no_exist', {}, 'Proveedor no existe'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }
    }

    const vendorNumber = payload.vendorNumber?.trim() || (providerId ? String(providerId) : null)

    if (payload.recipientClientId) {
      const recipientClient = await Client.find(payload.recipientClientId)
      if (!recipientClient) {
        return response
          .status(404)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.no_exist', {}, 'Receptor no existe'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }
    }

    const direction = payload.direction ?? null
    let companyName = payload.companyName?.trim() || null
    let companyAddress = payload.companyAddress?.trim() || null
    let companyCity = payload.companyCity?.trim() || null
    let companyCityCode = payload.companyCityCode?.trim() || null

    if (direction === 'issued' && provider) {
      if (!companyName) companyName = provider.name ?? null
      if (!companyAddress) companyAddress = provider.address ?? null
      if (!companyCity && provider.cityId) {
        const city = await City.find(provider.cityId)
        companyCity = city?.name ?? null
      }
      if (!companyCityCode && provider.cityId) {
        companyCityCode = String(provider.cityId)
      }
    }

    if (!companyName && resolvedClient) companyName = resolvedClient.name ?? null
    if (!companyAddress && resolvedClient) companyAddress = resolvedClient.address ?? null
    if (!companyCity && resolvedClient?.cityId) {
      const city = await City.find(resolvedClient.cityId)
      companyCity = city?.name ?? null
    }
    if (!companyCityCode && resolvedClient?.cityId) {
      companyCityCode = String(resolvedClient.cityId)
    }

    if (direction === 'received') {
      if (!companyName) companyName = business.name ?? null
      if (!companyAddress) companyAddress = business.address ?? null
      if (!companyCity && business.cityId) {
        const city = await City.find(business.cityId)
        companyCity = city?.name ?? null
      }
      if (!companyCityCode && business.cityId) {
        companyCityCode = String(business.cityId)
      }
    }

    const lineCurrencyIds = [
      ...new Set(
        payload.lines
          .map((line) => line.currencyId)
          .filter((currencyId): currencyId is number => typeof currencyId === 'number')
      ),
    ]
    const currencySymbolById = new Map<number, string>()

    if (lineCurrencyIds.length) {
      const coins = await Coin.query().whereIn('id', lineCurrencyIds).select(['id', 'symbol'])

      const coinIds = new Set(coins.map((coin) => coin.id))
      const missingCurrencyId = lineCurrencyIds.find((currencyId) => !coinIds.has(currencyId))

      if (missingCurrencyId) {
        return response
          .status(404)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.no_exist', {}, 'Moneda no existe'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      for (const coin of coins) {
        currencySymbolById.set(coin.id, coin.symbol)
      }
    }

    const trx = await db.transaction()

    try {
      let number = payload.number?.trim()
      if (!number) {
        const last = await trx
          .from('service_entry_sheets')
          .where('business_id', businessId)
          .orderBy('id', 'desc')
          .limit(1)

        const lastNumberRaw = last.length ? Number(last[0].number) : Number.NaN
        let nextNumber = 1

        if (Number.isFinite(lastNumberRaw) && lastNumberRaw > 0) {
          nextNumber = lastNumberRaw + 1
        } else if (last.length) {
          nextNumber = Number(last[0].id) + 1
        }

        number = String(nextNumber)
      }

      const sheet = await ServiceEntrySheet.create(
        {
          token: Util.generateToken(24),
          budgetPaymentId: payload.budgetPaymentId ?? null,
          clientId: resolvedClientId,
          providerId,
          businessId,
          authorizerId: payload.authorizerId ?? null,
          isAuthorized: false,
          authorizerAt: null,
          direction,
          issuerName: payload.issuerName ?? null,
          recipientName: payload.recipientName ?? null,
          issuerClientId: payload.issuerClientId ?? null,
          recipientClientId: payload.recipientClientId ?? null,
          documentTitle: payload.documentTitle ?? null,
          noteToInvoice: payload.noteToInvoice ?? null,
          companyName,
          companyAddress,
          companyCity,
          companyCityCode,
          serviceName: payload.serviceName ?? null,
          number,
          issueDate,
          purchaseOrderNumber,
          purchaseOrderPosition: payload.purchaseOrderPosition ?? null,
          purchaseOrderDate,
          vendorNumber,
          currency: payload.currency ?? null,
          totalNetAmount: payload.totalNetAmount ?? undefined,
        },
        { client: trx }
      )

      const lineRows = await Promise.all(
        payload.lines.map(async (line) => {
          let serviceCode = line.serviceCode ?? null
          let description = line.description ?? null
          let unitPrice = line.unitPrice ?? undefined
          let unit = line.unit ?? null
          let unitType = line.unitType ?? null

          // Auto-fill from product if productId is provided
          if (line.productId) {
            if (direction === 'received') {
              let providerProduct: ProviderProduct | null = null
              if (providerId) {
                providerProduct = await ProviderProduct.query()
                  .where('id', line.productId)
                  .where('provider_id', providerId)
                  .first()
              }

              if (providerProduct) {
                if (!serviceCode) serviceCode = providerProduct.code ?? null
                if (!description) description = providerProduct.name ?? null
                if (unitPrice === undefined) unitPrice = providerProduct.price ?? undefined
              }

              if (!description || !serviceCode || unitPrice === undefined) {
                const fallbackProduct = await Product.query()
                  .where('id', line.productId)
                  .where('business_id', businessId)
                  .first()

                if (fallbackProduct) {
                  if (!description) description = fallbackProduct.name ?? null
                  if (unitPrice === undefined) unitPrice = fallbackProduct.amount ?? undefined
                }
              }
            } else {
              const product = await Product.query()
                .where('id', line.productId)
                .where('business_id', businessId)
                .first()
              if (product) {
                if (!description) description = product.name ?? null
                if (unitPrice === undefined) unitPrice = product.amount ?? undefined
              }
            }

            if (!description) {
              description = serviceCode ?? line.planningLine ?? null
            }
          }

          const lineQuantity = line.quantity ?? undefined
          return {
            productId: line.productId ?? null,
            lineNumber: line.lineNumber ?? null,
            serviceCode,
            description,
            planningLine: line.planningLine ?? null,
            currencyId: line.currencyId ?? null,
            exchangeRate: line.exchangeRate ?? undefined,
            currency: line.currencyId ? (currencySymbolById.get(line.currencyId) ?? null) : null,
            unit,
            unitType,
            unitPrice,
            quantity: lineQuantity,
            netValue:
              line.netValue ??
              (unitPrice !== undefined && lineQuantity !== undefined
                ? unitPrice * lineQuantity
                : undefined),
          }
        })
      )

      if (lineRows.length) {
        await sheet.related('lines').createMany(lineRows, { client: trx })
      }

      sheet.totalNetAmount = lineRows.reduce((total, line) => total + (line.netValue ?? 0), 0)
      await sheet.save()

      await trx.commit()

      await sheet.load('client', (q) => q.select(['id', 'name', 'identify', 'identify_type_id', 'phone']))
      await sheet.load('provider', (q) => q.select(['id', 'name', 'phone']))
      await sheet.load('lines')

      const createdAt = sheet.createdAt
        ? sheet.createdAt.toFormat('yyyy-LL-dd HH:mm:ss')
        : DateTime.now().toFormat('yyyy-LL-dd HH:mm:ss')

      await auth.getUserOrFail().load('personalData')
      const creatorUser = auth.getUserOrFail()
      const createdByName =
        creatorUser.personalData?.fullName?.trim() || creatorUser.email || String(creatorUser.id)

      const clientName = sheet.client?.name ?? null
      const providerName = sheet.provider?.name ?? null
      const businessName = business.name ?? null

      const emitterName =
        sheet.issuerName ??
        (sheet.direction === 'received' ? providerName : businessName) ??
        clientName

      const receiverName =
        sheet.recipientName ??
        (sheet.direction === 'received' ? businessName : providerName) ??
        clientName

      try {
        logger.info('service_entry_sheet.store: starting in-app notification flow', {
          serviceEntrySheetId: sheet.id,
          number: sheet.number,
          businessId,
          createdById: creatorUser.id,
        })

        const type = await NotificationType.query()
          .where('code', 'service_entry_sheet_created')
          .where('enabled', true)
          .first()

        if (!type) {
          throw new Error('Missing or disabled notification type: service_entry_sheet_created')
        }

        logger.info('service_entry_sheet.store: notification type resolved', {
          serviceEntrySheetId: sheet.id,
          businessId,
          notificationTypeId: type.id,
          code: type.code,
        })

        const issueDateStr = sheet.issueDate
          ? sheet.issueDate.toFormat('dd/LL/yyyy')
          : DateTime.now().toFormat('dd/LL/yyyy')
        const title = `HES creada #${sheet.number}`
        const shortBody = `${title} • ${issueDateStr}`
        const recipientBusinessUserIds = await NotificationService.resolveRecipientsForType(
          type.id,
          businessId
        )

        logger.info('service_entry_sheet.store: notification recipients resolved', {
          serviceEntrySheetId: sheet.id,
          businessId,
          notificationTypeId: type.id,
          recipientsCount: recipientBusinessUserIds.length,
          recipientBusinessUserIds,
        })

        const notification = await NotificationService.createAndDispatch({
          typeId: type.id,
          businessId,
          recipientBusinessUserIds,
          title,
          body: shortBody,
          payload: {
            serviceEntrySheetId: sheet.id,
            sheetId: sheet.id,
            number: sheet.number,
            documentNumber: sheet.number,
            direction: sheet.direction,
            createdByUserId: creatorUser.id,
            createdByName,
            createdAt,
            created_at: createdAt,
            emitterName,
            receiverName,
            issueDate: sheet.issueDate ? sheet.issueDate.toISODate() : null,
            clientId: sheet.clientId,
            clientName,
            providerId: sheet.providerId,
            providerName,
            issuerClientId: sheet.issuerClientId,
            recipientClientId: sheet.recipientClientId,
            businessId,
            businessName,
            serviceName: sheet.serviceName,
            documentTitle: sheet.documentTitle,
            showParams: {
              id: sheet.id,
              businessId,
            },
          },
          meta: {
            sheetId: sheet.id,
            number: sheet.number,
            documentNumber: sheet.number,
            direction: sheet.direction,
            createdByUserId: creatorUser.id,
            createdByName,
            createdAt,
            created_at: createdAt,
            emitterName,
            receiverName,
            issueDate: sheet.issueDate ? sheet.issueDate.toISODate() : null,
            clientId: sheet.clientId,
            clientName,
            providerId: sheet.providerId,
            providerName,
            issuerClientId: sheet.issuerClientId,
            recipientClientId: sheet.recipientClientId,
            businessId,
            businessName,
            serviceName: sheet.serviceName,
            documentTitle: sheet.documentTitle,
            showParams: {
              id: sheet.id,
              businessId,
            },
          },
          createdById: creatorUser.id,
        })

        logger.info('service_entry_sheet.store: in-app notification dispatched', {
          serviceEntrySheetId: sheet.id,
          businessId,
          notificationId: notification.id,
          notificationTypeId: type.id,
        })
      } catch (notifyErr) {
        logger.error('service_entry_sheet.store: in-app notification failed', {
          serviceEntrySheetId: sheet.id,
          number: sheet.number,
          businessId,
          error: notifyErr instanceof Error ? notifyErr.message : notifyErr,
          stack: notifyErr instanceof Error ? notifyErr.stack : undefined,
        })
        log('Service entry sheet in-app notification error:', notifyErr)
      }

      try {
        const createdEmailData = buildServiceEntrySheetCreatedEmailData(i18n, sheet, {
          clientName: sheet.client?.name ?? '',
          providerName: sheet.provider?.name ?? '',
          createdBy: creatorUser.email ?? '',
          businessName: business.name ?? '',
        })

        await sendServiceEntrySheetNotification(businessId, createdEmailData)

        logger.info('service_entry_sheet.store: email notification sent', {
          serviceEntrySheetId: sheet.id,
          businessId,
          subject: createdEmailData.subject,
        })
      } catch (notifyEmailErr) {
        logger.error('service_entry_sheet.store: email notification failed', {
          serviceEntrySheetId: sheet.id,
          number: sheet.number,
          businessId,
          error: notifyEmailErr instanceof Error ? notifyEmailErr.message : notifyEmailErr,
          stack: notifyEmailErr instanceof Error ? notifyEmailErr.stack : undefined,
        })
        log('Service entry sheet email notification error:', notifyEmailErr)
      }

      return response.status(201).json({
        sheet,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_ok', {}, 'HES creada correctamente'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      await trx.rollback()
      log(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.store_error'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async update(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'service_entry_sheets', 'update')

    const { request, response, i18n, params, auth } = ctx

    const businessId = Number(request.header('Business'))
    if (!Number.isFinite(businessId) || businessId <= 0) {
      return response
        .status(400)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.invalid_format', {}, 'Empresa invalida'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    const id = Number(params.id)
    if (!Number.isFinite(id) || id <= 0) {
      return response
        .status(422)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.invalid_format', {}, 'Id invalido'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    const payload = await request.validateUsing(serviceEntrySheetStoreValidator)

    const issueDate = parseDate(payload.issueDate)
    if (!issueDate.isValid) {
      return response
        .status(422)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.invalid_format', {}, 'Formato de fecha invalido'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    let purchaseOrderDate: DateTime | null = null
    if (payload.purchaseOrderDate) {
      const parsedPurchaseOrderDate = parseDate(payload.purchaseOrderDate)
      if (!parsedPurchaseOrderDate.isValid) {
        return response
          .status(422)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.invalid_format', {}, 'Formato de fecha invalido'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      purchaseOrderDate = parsedPurchaseOrderDate
    }

    const lineCurrencyIds = [
      ...new Set(
        payload.lines
          .map((line) => line.currencyId)
          .filter((currencyId): currencyId is number => typeof currencyId === 'number')
      ),
    ]

    const currencySymbolById = new Map<number, string>()
    if (lineCurrencyIds.length) {
      const coins = await Coin.query().whereIn('id', lineCurrencyIds).select(['id', 'symbol'])
      const coinIds = new Set(coins.map((coin) => coin.id))
      const missingCurrencyId = lineCurrencyIds.find((currencyId) => !coinIds.has(currencyId))

      if (missingCurrencyId) {
        return response
          .status(404)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.no_exist', {}, 'Moneda no existe'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      for (const coin of coins) {
        currencySymbolById.set(coin.id, coin.symbol)
      }
    }

    const trx = await db.transaction()

    try {
      const sheet = await ServiceEntrySheet.query({ client: trx })
        .where('id', id)
        .where('business_id', businessId)
        .first()

      if (!sheet) {
        await trx.rollback()
        return response
          .status(404)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.no_exist', {}, 'HES no existe'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      if (payload.clientId) {
        const client = await Client.find(payload.clientId)
        if (!client) {
          await trx.rollback()
          return response
            .status(404)
            .json(
              MessageFrontEnd(
                i18n.formatMessage('messages.no_exist', {}, 'Cliente no existe'),
                i18n.formatMessage('messages.error_title')
              )
            )
        }
      }

      if (payload.providerId) {
        const provider = await Provider.find(payload.providerId)
        if (!provider) {
          await trx.rollback()
          return response
            .status(404)
            .json(
              MessageFrontEnd(
                i18n.formatMessage('messages.no_exist', {}, 'Proveedor no existe'),
                i18n.formatMessage('messages.error_title')
              )
            )
        }
      }

      const lineRows = payload.lines.map((line) => {
        const unitPrice = line.unitPrice ?? undefined
        const quantity = line.quantity ?? undefined
        return {
          productId: line.productId ?? null,
          lineNumber: line.lineNumber ?? null,
          serviceCode: line.serviceCode ?? null,
          description: line.description ?? null,
          planningLine: line.planningLine ?? null,
          currencyId: line.currencyId ?? null,
          exchangeRate: line.exchangeRate ?? undefined,
          currency: line.currencyId ? (currencySymbolById.get(line.currencyId) ?? null) : null,
          unit: line.unit ?? null,
          unitType: line.unitType ?? null,
          unitPrice,
          quantity,
          netValue:
            line.netValue ??
            (unitPrice !== undefined && quantity !== undefined ? unitPrice * quantity : undefined),
        }
      })

      sheet.merge({
        token: sheet.token ?? Util.generateToken(24),
        budgetPaymentId: payload.budgetPaymentId ?? null,
        clientId: payload.clientId ?? null,
        providerId: payload.providerId ?? null,
        authorizerId: payload.authorizerId ?? null,
        direction: payload.direction ?? null,
        issuerName: payload.issuerName ?? null,
        recipientName: payload.recipientName ?? null,
        issuerClientId: payload.issuerClientId ?? null,
        recipientClientId: payload.recipientClientId ?? null,
        documentTitle: payload.documentTitle ?? null,
        noteToInvoice: payload.noteToInvoice ?? null,
        companyName: payload.companyName ?? null,
        companyAddress: payload.companyAddress ?? null,
        companyCity: payload.companyCity ?? null,
        companyCityCode: payload.companyCityCode ?? null,
        serviceName: payload.serviceName ?? null,
        number: payload.number ?? sheet.number,
        issueDate,
        purchaseOrderNumber: payload.purchaseOrderNumber?.trim() || null,
        purchaseOrderPosition: payload.purchaseOrderPosition ?? null,
        purchaseOrderDate,
        vendorNumber: payload.vendorNumber?.trim() || null,
        currency: payload.currency ?? null,
        totalNetAmount: lineRows.reduce((total, line) => total + (line.netValue ?? 0), 0),
        updatedById: auth.user?.id ?? null,
        deletedAt: null,
        deletedById: null,
        enabled: true,
      })

      await sheet.useTransaction(trx).save()

      await db
        .from('service_entry_lines')
        .useTransaction(trx)
        .where('service_entry_sheet_id', sheet.id)
        .delete()

      if (lineRows.length) {
        await sheet.related('lines').createMany(lineRows, { client: trx })
      }

      await trx.commit()

      await sheet.load('client', (q) => q.select(['id', 'name', 'identify', 'identify_type_id', 'phone']))
      await sheet.load('provider', (q) => q.select(['id', 'name', 'phone']))
      await sheet.load('lines')

      return response.status(200).json({
        sheet,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok', {}, 'HES actualizada correctamente'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      await trx.rollback()
      log(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.update_error'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async disable(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'service_entry_sheets', 'update')

    const { request, response, i18n, params, auth } = ctx

    const businessId = Number(request.header('Business'))
    if (!Number.isFinite(businessId) || businessId <= 0) {
      return response
        .status(400)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.invalid_format', {}, 'Empresa invalida'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    const id = Number(params.id)
    if (!Number.isFinite(id) || id <= 0) {
      return response
        .status(422)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.invalid_format', {}, 'Id invalido'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    const sheet = await ServiceEntrySheet.query()
      .where('id', id)
      .where('business_id', businessId)
      .first()

    if (!sheet) {
      return response
        .status(404)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.no_exist', {}, 'HES no existe'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    sheet.enabled = false
    sheet.deletedAt = DateTime.now()
    sheet.deletedById = auth.user?.id ?? null
    sheet.updatedById = auth.user?.id ?? null
    await sheet.save()

    return response
      .status(200)
      .json(
        MessageFrontEnd(
          i18n.formatMessage('messages.delete_ok', {}, 'HES deshabilitada correctamente'),
          i18n.formatMessage('messages.ok_title')
        )
      )
  }

  public async delete(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'service_entry_sheets', 'delete')

    const { request, response, i18n, params } = ctx

    const businessId = Number(request.header('Business'))
    if (!Number.isFinite(businessId) || businessId <= 0) {
      return response
        .status(400)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.invalid_format', {}, 'Empresa invalida'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    const id = Number(params.id)
    if (!Number.isFinite(id) || id <= 0) {
      return response
        .status(422)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.invalid_format', {}, 'Id invalido'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    const trx = await db.transaction()
    try {
      const sheet = await ServiceEntrySheet.query({ client: trx })
        .where('id', id)
        .where('business_id', businessId)
        .first()

      if (!sheet) {
        await trx.rollback()
        return response
          .status(404)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.no_exist', {}, 'HES no existe'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      await db
        .from('service_entry_lines')
        .useTransaction(trx)
        .where('service_entry_sheet_id', id)
        .delete()

      await db.from('service_entry_sheets').useTransaction(trx).where('id', id).delete()

      await trx.commit()

      return response
        .status(200)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.delete_ok', {}, 'HES eliminada correctamente'),
            i18n.formatMessage('messages.ok_title')
          )
        )
    } catch (error) {
      await trx.rollback()
      log(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.delete_error'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async show(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'service_entry_sheets', 'view')

    const { params, response, i18n } = ctx

    try {
      const sheet = await ServiceEntrySheet.query()
        .where('id', Number(params.id))
        .preload('client', (q) => q.select(['id', 'name', 'identify', 'identify_type_id', 'phone']))
        .preload('authorizer', (q) => {
          q.select(['id', 'personal_data_id', 'email'])
          q.preload('personalData', (pdQ) =>
            pdQ.select(['id', 'names', 'last_name_p', 'last_name_m'])
          )
        })
        .preload('lines')
        .firstOrFail()

      return response.status(200).json(sheet)
    } catch (error) {
      log(error)
      return response
        .status(404)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.no_exist'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async showPublic(ctx: HttpContext) {
    const { params, response, i18n } = ctx
    const token = String(params.token || '').trim()

    if (!token) {
      return response
        .status(400)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.invalid_format', {}, 'Token invalido'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    const sheet = await ServiceEntrySheet.query()
      .where('token', token)
      .where('enabled', true)
      .preload('business', (q) => q.select(['id', 'name', 'url', 'email', 'identify']))
      .preload('client', (q) => q.select(['id', 'name', 'identify', 'email', 'address', 'phone']))
      .preload('provider', (q) => q.select(['id', 'name', 'email', 'address', 'phone']))
      .preload('issuerClient', (q) =>
        q.select(['id', 'name', 'identify', 'email', 'address', 'phone'])
      )
      .preload('recipientClient', (q) =>
        q.select(['id', 'name', 'identify', 'email', 'address', 'phone'])
      )
      .preload('lines')
      .first()

    if (!sheet) {
      return response
        .status(404)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.no_exist', {}, 'HES no existe'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    return response.status(200).json(serializeServiceEntrySheetPublic(sheet))
  }

  public async sendEmailToClient(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'service_entry_sheets', 'view')

    const { params, response, i18n } = ctx
    const id = Number(params.id)
    const { email } = await ctx.request.validateUsing(
      vine.compile(
        vine.object({
          email: vine.string().email().optional(),
        })
      )
    )

    if (!Number.isFinite(id) || id <= 0) {
      return response
        .status(422)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.invalid_format', {}, 'Id invalido'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    const sheet = await ServiceEntrySheet.find(id)
    if (!sheet) {
      return response
        .status(404)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.no_exist', {}, 'HES no existe'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    await sheet.load('client', (q) => q.select(['id', 'name', 'email']))
    await sheet.load('provider', (q) => q.select(['id', 'name', 'email']))
    await sheet.load('business', (q) => q.select(['id', 'name']))

    const recipientEmail = email || sheet.client?.email || sheet.provider?.email
    if (!recipientEmail) {
      return response
        .status(400)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.no_exist', {}, 'No existe correo de destino'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    if (!sheet.token) {
      sheet.token = Util.generateToken(24)
      await sheet.save()
    }

    const host =
      env.get('NODE_ENV') === 'development'
        ? 'http://212.38.95.163/sigmig/'
        : 'https://admin.serviciosgenessis.com/'

    const sheetUrl = host + `client/service-entry-sheet/${sheet.token}`

    const emailData = buildServiceEntrySheetClientEmailData(i18n, sheet, {
      clientName: sheet.client?.name ?? '',
      providerName: sheet.provider?.name ?? '',
      businessName: sheet.business?.name ?? '',
      sheetUrl,
    })

    await mail.sendLater((message) => {
      message
        .to(recipientEmail)
        .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
        .subject(emailData.subject)
        .htmlView('emails/service_entry_sheet_client', emailData)
    })

    return response
      .status(200)
      .json(
        MessageFrontEnd(
          i18n.formatMessage('messages.email_send_ok'),
          i18n.formatMessage('messages.ok_title')
        )
      )
  }

  public async authorize(ctx: HttpContext, skipPermission = false) {
    if (!skipPermission) {
      await PermissionService.requirePermission(ctx, 'service_entry_sheets', 'authorize')
    }

    const { request, auth, response, i18n } = ctx

    const businessId = Number(request.header('Business'))
    if (!Number.isFinite(businessId) || businessId <= 0) {
      return response
        .status(400)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.invalid_format', {}, 'Empresa invalida'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    const payload = await request.validateUsing(serviceEntrySheetAuthorizeValidator)

    const authUser = auth.getUserOrFail()
    const activeBusinessUser = authUser.isAdmin
      ? null
      : await authUser.related('businessUser').query().where('business_id', businessId).first()

    const canAuthorize =
      authUser.isAdmin ||
      authUser.isAuthorizer ||
      Boolean(activeBusinessUser?.isAuthorizer) ||
      Boolean(activeBusinessUser?.isSuper)

    if (!canAuthorize) {
      return response
        .status(403)
        .json(
          MessageFrontEnd(
            i18n.formatMessage(
              'messages.no_authorizer_permission',
              {},
              'No tienes permisos para autorizar esta HES.'
            ),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    const sheet = await ServiceEntrySheet.query()
      .where('id', payload.id)
      .where('business_id', businessId)
      .first()

    if (!sheet) {
      return response
        .status(404)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.no_exist', {}, 'HES no existe'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    sheet.isAuthorized = true
    sheet.authorizerId = authUser.id
    sheet.authorizerAt = DateTime.now()
    await sheet.save()

    try {
      logger.info('service_entry_sheet.authorize: starting in-app notification flow', {
        serviceEntrySheetId: sheet.id,
        number: sheet.number,
        businessId,
        authorizedByUserId: authUser.id,
      })

      const type = await NotificationType.query()
        .where('code', 'service_entry_sheet_authorized')
        .where('enabled', true)
        .first()

      if (!type) {
        throw new Error('Missing or disabled notification type: service_entry_sheet_authorized')
      }

      logger.info('service_entry_sheet.authorize: notification type resolved', {
        serviceEntrySheetId: sheet.id,
        businessId,
        notificationTypeId: type.id,
        code: type.code,
      })

      const authorizedAt = sheet.authorizerAt
        ? sheet.authorizerAt.toFormat('yyyy-LL-dd HH:mm:ss')
        : DateTime.now().toFormat('yyyy-LL-dd HH:mm:ss')

      await authUser.load('personalData')

      const [client, provider, issuerClient, recipientClient, business] = await Promise.all([
        sheet.clientId ? Client.find(sheet.clientId) : Promise.resolve(null),
        sheet.providerId ? Provider.find(sheet.providerId) : Promise.resolve(null),
        sheet.issuerClientId ? Client.find(sheet.issuerClientId) : Promise.resolve(null),
        sheet.recipientClientId ? Client.find(sheet.recipientClientId) : Promise.resolve(null),
        sheet.businessId ? Business.find(sheet.businessId) : Promise.resolve(null),
      ])

      const authorizedByName =
        authUser.personalData?.fullName?.trim() || authUser.email || String(authUser.id)

      const clientName = client?.name ?? null
      const providerName = provider?.name ?? null
      const issuerClientName = issuerClient?.name ?? null
      const recipientClientName = recipientClient?.name ?? null
      const businessName = business?.name ?? null

      const emitterName =
        sheet.issuerName ??
        issuerClientName ??
        (sheet.direction === 'received' ? providerName : businessName) ??
        clientName

      const receiverName =
        sheet.recipientName ??
        recipientClientName ??
        (sheet.direction === 'received' ? businessName : providerName) ??
        clientName

      const notification = await NotificationService.createAndDispatch({
        typeId: type.id,
        businessId,
        title: `HES autorizada #${sheet.number}`,
        body: `La hoja de entrada de servicios #${sheet.number} fue autorizada.`,
        payload: {
          serviceEntrySheetId: sheet.id,
          sheetId: sheet.id,
          number: sheet.number,
          documentNumber: sheet.number,
          direction: sheet.direction,
          authorizedByUserId: authUser.id,
          authorizedByName,
          authorizedAt,
          authorized_at: authorizedAt,
          emitterName,
          receiverName,
          issueDate: sheet.issueDate ? sheet.issueDate.toISODate() : null,
          clientId: sheet.clientId,
          clientName,
          providerId: sheet.providerId,
          providerName,
          issuerClientId: sheet.issuerClientId,
          issuerClientName,
          recipientClientId: sheet.recipientClientId,
          recipientClientName,
          businessId,
          businessName,
          serviceName: sheet.serviceName,
          documentTitle: sheet.documentTitle,
          showParams: {
            id: sheet.id,
            businessId,
          },
        },
        meta: {
          sheetId: sheet.id,
          number: sheet.number,
          documentNumber: sheet.number,
          direction: sheet.direction,
          authorizedByUserId: authUser.id,
          authorizedByName,
          authorizedAt,
          authorized_at: authorizedAt,
          emitterName,
          receiverName,
          issueDate: sheet.issueDate ? sheet.issueDate.toISODate() : null,
          clientId: sheet.clientId,
          clientName,
          providerId: sheet.providerId,
          providerName,
          issuerClientId: sheet.issuerClientId,
          issuerClientName,
          recipientClientId: sheet.recipientClientId,
          recipientClientName,
          businessId,
          businessName,
          serviceName: sheet.serviceName,
          documentTitle: sheet.documentTitle,
          showParams: {
            id: sheet.id,
            businessId,
          },
        },
        createdById: authUser.id,
      })

      logger.info('service_entry_sheet.authorize: in-app notification dispatched', {
        serviceEntrySheetId: sheet.id,
        businessId,
        notificationId: notification.id,
        notificationTypeId: type.id,
      })
    } catch (notifyError) {
      logger.error('service_entry_sheet.authorize: in-app notification failed', {
        serviceEntrySheetId: sheet.id,
        number: sheet.number,
        businessId,
        authorizedByUserId: authUser.id,
        error: notifyError instanceof Error ? notifyError.message : notifyError,
        stack: notifyError instanceof Error ? notifyError.stack : undefined,
      })
      log(notifyError)
    }

    await sheet.load('provider', (q) => q.select(['id', 'name', 'phone']))

    try {
      const business = await Business.find(businessId)
      const authorizedEmailData = buildServiceEntrySheetAuthorizedEmailData(i18n, sheet, {
        clientName: sheet.client?.name ?? '',
        providerName: sheet.provider?.name ?? '',
        authorizedBy: authUser.email ?? '',
        businessName: business?.name ?? '',
      })

      logger.info('service_entry_sheet.authorize: starting email notification flow', {
        serviceEntrySheetId: sheet.id,
        businessId,
        subject: authorizedEmailData.subject,
      })

      await sendServiceEntrySheetNotification(
        businessId,
        authorizedEmailData,
        'emails/service_entry_sheet_authorized'
      )

      logger.info('service_entry_sheet.authorize: email notification sent', {
        serviceEntrySheetId: sheet.id,
        businessId,
        subject: authorizedEmailData.subject,
      })
    } catch (notifyEmailError) {
      logger.error('service_entry_sheet.authorize: email notification failed', {
        serviceEntrySheetId: sheet.id,
        number: sheet.number,
        businessId,
        error: notifyEmailError instanceof Error ? notifyEmailError.message : notifyEmailError,
        stack: notifyEmailError instanceof Error ? notifyEmailError.stack : undefined,
      })
      log('Service entry sheet authorization email error:', notifyEmailError)
    }

    await sheet.load('client', (q) => q.select(['id', 'name', 'identify', 'identify_type_id', 'phone']))
    await sheet.load('lines')

    return response.status(200).json({
      sheet,
      ...MessageFrontEnd(
        i18n.formatMessage('messages.update_ok', {}, 'HES autorizada correctamente'),
        i18n.formatMessage('messages.ok_title')
      ),
    })
  }

  public async authorizer(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'service_entry_sheets', 'authorize')
    return this.authorize(ctx, true)
  }
}

async function sendServiceEntrySheetNotification(
  businessId: number | undefined,
  emailData: {
    subject: string
    body: string
    serviceEntrySheetNumber: string
    issueDate?: string
    authorizationDate?: string
    clientName?: string
    providerName?: string
    createdBy?: string
    authorizedBy?: string
    status?: string
    statusLabel?: string
    businessName: string
    serviceEntrySheetNumberLabel: string
    issueDateLabel: string
    authorizationDateLabel: string
    clientLabel: string
    providerLabel: string
    createdByLabel: string
    authorizedByLabel: string
  },
  template: string = 'emails/service_entry_sheet_created'
) {
  if (!businessId) return

  const superUsers = await BusinessUser.query()
    .where('business_id', businessId)
    .where('is_super', true)
    .preload('user', (userQuery) => {
      userQuery.select(['id', 'email'])
    })

  if (!superUsers.length) return

  for (const businessUser of superUsers) {
    if (!businessUser.user?.email) continue

    await mail.send((message) => {
      message
        .to(businessUser.user!.email)
        .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
        .subject(emailData.subject)
        .htmlView(template, emailData)
    })
  }
}

function buildServiceEntrySheetCreatedEmailData(
  i18n: HttpContext['i18n'],
  sheet: ServiceEntrySheet,
  opts: {
    clientName: string
    providerName: string
    createdBy: string
    businessName: string
  }
) {
  const issueDate = sheet.issueDate ? sheet.issueDate.toFormat('dd/LL/yyyy') : ''
  const status = i18n.formatMessage('messages.service_entry_sheet_status_created', {}, 'created')

  return {
    subject: i18n.formatMessage('messages.service_entry_sheet_created_email_subject', {
      sheetNumber: sheet.number,
    }),
    body: i18n.formatMessage('messages.service_entry_sheet_created_email_body', {
      sheetNumber: sheet.number,
      issueDate,
      clientName: opts.clientName,
      providerName: opts.providerName,
      status,
      createdBy: opts.createdBy,
    }),
    serviceEntrySheetNumber: sheet.number,
    issueDate,
    clientName: opts.clientName,
    providerName: opts.providerName,
    createdBy: opts.createdBy,
    status,
    statusLabel: i18n.formatMessage('messages.current_status', {}, 'Current Status'),
    businessName: opts.businessName,
    serviceEntrySheetNumberLabel: i18n.formatMessage(
      'messages.service_entry_sheet_number',
      {},
      'HES Number'
    ),
    issueDateLabel: i18n.formatMessage('messages.issue_date', {}, 'Issue Date'),
    authorizationDateLabel: i18n.formatMessage(
      'messages.authorization_date',
      {},
      'Authorization Date'
    ),
    clientLabel: i18n.formatMessage('messages.client', {}, 'Client'),
    providerLabel: i18n.formatMessage('messages.provider', {}, 'Provider'),
    createdByLabel: i18n.formatMessage('messages.created_by', {}, 'Created by'),
    authorizedByLabel: i18n.formatMessage('messages.authorized_by', {}, 'Authorized by'),
  }
}

function buildServiceEntrySheetAuthorizedEmailData(
  i18n: HttpContext['i18n'],
  sheet: ServiceEntrySheet,
  opts: {
    clientName: string
    providerName: string
    authorizedBy: string
    businessName: string
  }
) {
  const authorizationDate = sheet.authorizerAt ? sheet.authorizerAt.toFormat('dd/LL/yyyy') : ''
  const status = i18n.formatMessage(
    'messages.service_entry_sheet_status_authorized',
    {},
    'authorized'
  )

  return {
    subject: i18n.formatMessage('messages.service_entry_sheet_authorized_email_subject', {
      sheetNumber: sheet.number,
    }),
    body: i18n.formatMessage('messages.service_entry_sheet_authorized_email_body', {
      sheetNumber: sheet.number,
      authorizationDate,
      clientName: opts.clientName,
      providerName: opts.providerName,
      status,
      authorizedBy: opts.authorizedBy,
    }),
    serviceEntrySheetNumber: sheet.number,
    authorizationDate,
    clientName: opts.clientName,
    providerName: opts.providerName,
    authorizedBy: opts.authorizedBy,
    status,
    statusLabel: i18n.formatMessage('messages.current_status', {}, 'Current Status'),
    businessName: opts.businessName,
    serviceEntrySheetNumberLabel: i18n.formatMessage(
      'messages.service_entry_sheet_number',
      {},
      'HES Number'
    ),
    issueDateLabel: i18n.formatMessage('messages.issue_date', {}, 'Issue Date'),
    authorizationDateLabel: i18n.formatMessage(
      'messages.authorization_date',
      {},
      'Authorization Date'
    ),
    clientLabel: i18n.formatMessage('messages.client', {}, 'Client'),
    providerLabel: i18n.formatMessage('messages.provider', {}, 'Provider'),
    createdByLabel: i18n.formatMessage('messages.created_by', {}, 'Created by'),
    authorizedByLabel: i18n.formatMessage('messages.authorized_by', {}, 'Authorized by'),
  }
}

function buildServiceEntrySheetClientEmailData(
  i18n: HttpContext['i18n'],
  sheet: ServiceEntrySheet,
  opts: {
    clientName: string
    providerName: string
    businessName: string
    sheetUrl: string
  }
) {
  const issueDate = sheet.issueDate ? sheet.issueDate.toFormat('dd/LL/yyyy') : ''

  return {
    subject: i18n.formatMessage('messages.service_entry_sheet_email_subject', {
      sheetNumber: sheet.number,
    }, 'Nueva HES disponible para revision'),
    body: i18n.formatMessage(
      'messages.service_entry_sheet_email_body',
      {
        clientName: opts.clientName,
        providerName: opts.providerName,
        sheetNumber: sheet.number,
        issueDate,
        businessName: opts.businessName,
      },
      'Tu hoja de entrada de servicios esta disponible para revision.'
    ),
    serviceEntrySheetNumber: sheet.number,
    issueDate,
    clientName: opts.clientName,
    providerName: opts.providerName,
    businessName: opts.businessName,
    serviceEntrySheetUrl: opts.sheetUrl,
    serviceEntrySheetNumberLabel: i18n.formatMessage(
      'messages.service_entry_sheet_number',
      {},
      'HES Number'
    ),
    issueDateLabel: i18n.formatMessage('messages.issue_date', {}, 'Issue Date'),
    clientLabel: i18n.formatMessage('messages.client', {}, 'Client'),
    providerLabel: i18n.formatMessage('messages.provider', {}, 'Provider'),
    viewServiceEntrySheetLabel: i18n.formatMessage(
      'messages.view_service_entry_sheet',
      {},
      'View Service Entry Sheet'
    ),
  }
}

function serializeServiceEntrySheetPublic(sheet: ServiceEntrySheet) {
  return {
    number: sheet.number,
    direction: sheet.direction,
    issueDate: sheet.issueDate ? sheet.issueDate.toFormat('dd/LL/yyyy') : null,
    isAuthorized: !!sheet.isAuthorized,
    authorizedAt: sheet.authorizerAt ? sheet.authorizerAt.toFormat('dd/LL/yyyy HH:mm:ss') : null,
    documentTitle: sheet.documentTitle,
    noteToInvoice: sheet.noteToInvoice,
    serviceName: sheet.serviceName,
    purchaseOrderNumber: sheet.purchaseOrderNumber,
    purchaseOrderPosition: sheet.purchaseOrderPosition,
    purchaseOrderDate: sheet.purchaseOrderDate ? sheet.purchaseOrderDate.toFormat('dd/LL/yyyy') : null,
    vendorNumber: sheet.vendorNumber,
    currency: sheet.currency,
    totalNetAmount: Number(sheet.totalNetAmount ?? 0),
    company: {
      name: sheet.companyName,
      address: sheet.companyAddress,
      city: sheet.companyCity,
      cityCode: sheet.companyCityCode,
    },
    business: sheet.business
      ? {
        name: sheet.business.name,
        url: sheet.business.url,
        email: sheet.business.email,
        identify: sheet.business.identify,
      }
      : null,
    client: sheet.client
      ? {
        name: sheet.client.name,
        identify: sheet.client.identify,
        email: sheet.client.email,
        phone: sheet.client.phone,
        address: sheet.client.address,
      }
      : null,
    provider: sheet.provider
      ? {
        name: sheet.provider.name,
        email: sheet.provider.email,
        phone: sheet.provider.phone,
        address: sheet.provider.address,
      }
      : null,
    issuerClient: sheet.issuerClient
      ? {
        name: sheet.issuerClient.name,
        identify: sheet.issuerClient.identify,
        email: sheet.issuerClient.email,
        phone: sheet.issuerClient.phone,
        address: sheet.issuerClient.address,
      }
      : null,
    recipientClient: sheet.recipientClient
      ? {
        name: sheet.recipientClient.name,
        identify: sheet.recipientClient.identify,
        email: sheet.recipientClient.email,
        phone: sheet.recipientClient.phone,
        address: sheet.recipientClient.address,
      }
      : null,
    lines:
      sheet.lines?.map((line) => ({
        lineNumber: line.lineNumber,
        serviceCode: line.serviceCode,
        description: line.description,
        planningLine: line.planningLine,
        currency: line.currency,
        exchangeRate: line.exchangeRate,
        unit: line.unit,
        unitType: line.unitType,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        netValue: line.netValue,
      })) ?? [],
  }
}

const parseDate = (value: string) => {
  const iso = DateTime.fromISO(value)
  if (iso.isValid) return iso

  const dot = DateTime.fromFormat(value, 'dd.LL.yyyy')
  if (dot.isValid) return dot

  const slash = DateTime.fromFormat(value, 'dd/LL/yyyy')
  if (slash.isValid) return slash

  return iso
}

const serviceEntryLineSchema = vine.object({
  productId: vine.number().positive().optional(),
  lineNumber: vine.number().positive().optional(),
  serviceCode: vine.string().trim().optional(),
  description: vine.string().trim().optional(),
  planningLine: vine.string().trim().optional(),
  currencyId: vine.number().positive().optional(),
  exchangeRate: vine.number().min(0).optional(),
  unit: vine.string().trim().optional(),
  unitType: vine.string().trim().optional(),
  unitPrice: vine.number().min(0).optional(),
  quantity: vine.number().min(0).optional(),
  netValue: vine.number().min(0).optional(),
})

const serviceEntrySheetStoreValidator = vine.compile(
  vine.object({
    budgetPaymentId: vine.number().positive().optional(),
    clientId: vine.number().positive().optional(),
    providerId: vine.number().positive().optional(),
    authorizerId: vine.number().positive().optional(),
    direction: vine.enum(['issued', 'received']).optional(),
    issuerName: vine.string().trim().optional(),
    recipientName: vine.string().trim().optional(),
    issuerClientId: vine.number().positive().optional(),
    recipientClientId: vine.number().positive().optional(),
    documentTitle: vine.string().trim().optional(),
    noteToInvoice: vine.string().trim().optional(),
    companyName: vine.string().trim().optional(),
    companyAddress: vine.string().trim().optional(),
    companyCity: vine.string().trim().optional(),
    companyCityCode: vine.string().trim().optional(),
    serviceName: vine.string().trim().optional(),
    number: vine.string().trim().minLength(1).optional(),
    issueDate: vine.string().trim().minLength(1),
    purchaseOrderNumber: vine.string().trim().optional(),
    purchaseOrderPosition: vine.string().trim().optional(),
    purchaseOrderDate: vine.string().trim().optional(),
    vendorNumber: vine.string().trim().optional(),
    currency: vine.string().trim().optional(),
    totalNetAmount: vine.number().min(0).optional(),
    lines: vine.array(serviceEntryLineSchema).minLength(1),
  })
)

const serviceEntrySheetAuthorizeValidator = vine.compile(
  vine.object({
    id: vine.number().positive(),
  })
)
