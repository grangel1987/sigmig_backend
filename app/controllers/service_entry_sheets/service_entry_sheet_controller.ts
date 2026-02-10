import Client from '#models/clients/client'
import ServiceEntrySheet from '#models/service_entry_sheets/service_entry_sheet'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import { log } from 'node:console'

export default class ServiceEntrySheetController {
  public async store(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'service_entry_sheets', 'create')

    const { request, response, i18n } = ctx

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

      const sheet = await ServiceEntrySheet.create(
        {
          clientId: payload.clientId,
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
          totalNetAmount: payload.totalNetAmount ?? null,
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
        unitPrice: line.unitPrice ?? null,
        quantity: line.quantity ?? null,
        netValue: line.netValue ?? null,
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
    clientId: vine.number().positive(),
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
