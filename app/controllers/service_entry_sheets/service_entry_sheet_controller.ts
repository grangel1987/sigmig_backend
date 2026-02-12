import BudgetPayment from '#models/budget_payment'
import Business from '#models/business/business'
import Client from '#models/clients/client'
import Provider from '#models/provider/provider'
import ServiceEntrySheet from '#models/service_entry_sheets/service_entry_sheet'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import { log } from 'node:console'

export default class ServiceEntrySheetController {
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
    const purchaseOrderDate = payload.purchaseOrderDate
      ? parseDate(payload.purchaseOrderDate)
      : null

    if (!issueDate.isValid || (purchaseOrderDate && !purchaseOrderDate.isValid)) {
      return response
        .status(422)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.invalid_format', {}, 'Formato de fecha invalido'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }

    const trx = await db.transaction()

    try {
      if (payload.clientId) {
        const client = await Client.find(payload.clientId)
        if (!client) {
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

      if (payload.providerId) {
        const provider = await Provider.find(payload.providerId)
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

      const sheet = await ServiceEntrySheet.create(
        {
          budgetPaymentId: payload.budgetPaymentId ?? null,
          clientId: payload.clientId ?? null,
          providerId: payload.providerId ?? null,
          businessId,
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
          number: payload.number,
          issueDate,
          purchaseOrderNumber: payload.purchaseOrderNumber ?? null,
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
    number: vine.string().trim().minLength(1),
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
