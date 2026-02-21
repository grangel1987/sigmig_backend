import BudgetPayment from '#models/budget_payment'
import Buget from '#models/bugets/buget'
import Business from '#models/business/business'
import City from '#models/cities/City'
import Client from '#models/clients/client'
import Product from '#models/products/product'
import Provider from '#models/provider/provider'
import ProviderProduct from '#models/provider/provider_product'
import ServiceEntrySheet from '#models/service_entry_sheets/service_entry_sheet'
import Shopping from '#models/shoppings/shopping'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
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

      if (text)
        productQ.where(pQb =>
          pQb.whereRaw('name LIKE ?', [`%${text}%`])
            .orWhereRaw('code LIKE ?', [`%${text}%`]))

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


    if (text)
      bProductQ.whereRaw('name LIKE ?', [`%${text}%`])

    const products = await bProductQ

    return response.status(200).json(products)
  }

  public async index(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'service_entry_sheets', 'view')

    const { request, response, i18n } = ctx
    const { clientId, providerId, concept, page, perPage, startDate, endDate } = request.qs()

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
      .preload('client', (q) => q.select(['id', 'name', 'identify', 'identify_type_id']))
      .preload('provider', (q) => q.select(['id', 'name']))
      .where('business_id', businessId)

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

    const { request, response, i18n } = ctx

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

    const trx = await db.transaction()

    try {
      let number = payload.number?.trim()
      if (!number) {
        const last = await trx
          .from('service_entry_sheets')
          .where('business_id', businessId)
          .orderBy('id', 'desc')
          .limit(1)

        const lastNumberRaw = last.length ? Number(last[0].number) : NaN
        const nextNumber = Number.isFinite(lastNumberRaw) && lastNumberRaw > 0
          ? lastNumberRaw + 1
          : last.length
            ? Number(last[0].id) + 1
            : 1

        number = String(nextNumber)
      }

      const sheet = await ServiceEntrySheet.create(
        {
          budgetPaymentId: payload.budgetPaymentId ?? null,
          clientId: resolvedClientId,
          providerId,
          businessId,
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
          vendorNumber: payload.vendorNumber ?? null,
          currency: payload.currency ?? null,
          totalNetAmount: payload.totalNetAmount ?? undefined,
        },
        { client: trx }
      )

      const lineRows = payload.lines.map((line) => ({
        lineNumber: line.lineNumber ?? null,
        serviceCode: line.serviceCode ?? null,
        description: line.description ?? null,
        planningLine: line.planningLine ?? null,
        currency: line.currency ?? null,
        unit: line.unit ?? null,
        unitPrice: line.unitPrice ?? undefined,
        quantity: line.quantity ?? undefined,
        netValue: line.netValue ?? undefined,
      }))

      if (lineRows.length) {
        await sheet.related('lines').createMany(lineRows, { client: trx })
      }

      await trx.commit()

      await sheet.load('client', (q) => q.select(['id', 'name', 'identify', 'identify_type_id']))
      await sheet.load('lines')

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

  public async show(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'service_entry_sheets', 'view')

    const { params, response, i18n } = ctx

    try {
      const sheet = await ServiceEntrySheet.query()
        .where('id', Number(params.id))
        .preload('client', (q) => q.select(['id', 'name', 'identify', 'identify_type_id']))
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
  lineNumber: vine.number().positive().optional(),
  serviceCode: vine.string().trim().optional(),
  description: vine.string().trim().optional(),
  planningLine: vine.string().trim().optional(),
  currency: vine.string().trim().optional(),
  unit: vine.string().trim().optional(),
  unitPrice: vine.number().min(0).optional(),
  quantity: vine.number().min(0).optional(),
  netValue: vine.number().min(0).optional(),
})

const serviceEntrySheetStoreValidator = vine.compile(
  vine.object({
    budgetPaymentId: vine.number().positive().optional(),
    clientId: vine.number().positive().optional(),
    providerId: vine.number().positive().optional(),
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
