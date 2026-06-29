import NotificationType from '#models/notifications/notification_type'
import Sale, { type SaleDocument } from '#models/sales/sale'
import SaleRepository from '#repositories/sales/sale_repository'
import NotificationService from '#services/notification_service'
import PermissionService from '#services/permission_service'
import SalePaymentService from '#services/sale_payment_service'
import SaleService from '#services/sale_service'
import {
  buildSalesOverview,
  serializeSale,
  serializeSaleCollection,
} from '#services/sales/sale_payload_service'
import env from '#start/env'
import { Google } from '#utils/Google'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import {
  saleAssociateValidator,
  saleChangeClientValidator,
  saleIdParamValidator,
  saleIndexValidator,
  saleOverviewValidator,
  salePaymentSettleValidator,
  salePaymentStoreValidator,
  salePaymentUpdateValidator,
  saleSendEmailValidator,
  saleStoreValidator,
  saleUpdateStatusValidator,
  saleUpdateValidator,
} from '#validators/sale'
import { HttpContext } from '@adonisjs/core/http'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {}
}

async function buildSaleDocumentPayload(
  request: HttpContext['request']
): Promise<SaleDocument | undefined> {
  const fileOptions = {
    extnames: ['pdf', 'jpg', 'png', 'jpeg', 'webp', 'doc', 'docx'],
    size: '10mb',
  }

  const documentFile =
    request.file('documentFile', fileOptions) ??
    request.file('document_file', fileOptions) ??
    request.file('purchaseOrderFile', fileOptions) ??
    request.file('purchase_order_file', fileOptions)

  if (!documentFile?.tmpPath) {
    return undefined
  }

  const isImage = (documentFile.type || '').startsWith('image')
  const upload = await Google.uploadFile(documentFile, 'sales/documents', isImage ? 'image' : 'file')

  const documentTypeInput = request.input('documentType') ?? request.input('document_type')
  const validTypes = ['invoice', 'hes', 'purchase_order'] as const
  const type = validTypes.includes(documentTypeInput as any)
    ? (documentTypeInput as typeof validTypes[number])
    : undefined

  return {
    name: documentFile.clientName ?? 'document',
    contentType: documentFile.type ?? 'application/octet-stream',
    filePath: upload.url_short,
    thumbPath: upload.url_thumb_short || undefined,
    fileUrl: upload.url,
    thumbUrl: upload.url_thumb || undefined,
    type,
  }
}

async function deleteExistingSaleDocument(sale: Sale | null) {
  const document = asObject(sale?.document)
  const filePaths = [document.filePath, document.thumbPath].filter(
    (filePath): filePath is string => typeof filePath === 'string' && filePath.trim().length > 0
  )

  await Promise.all(
    filePaths.map((filePath) =>
      Google.deleteFile(filePath).catch((error) => {
        console.log('Sale document delete error:', error)
      })
    )
  )
}

export default class SaleController {
  public async overview(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'view')

    const { request, response, i18n } = ctx

    try {
      const { businessId, status, startDate, endDate } = await request.validateUsing(
        saleOverviewValidator
      )

      const headerBusinessId = Number(request.header('Business'))
      const resolvedBusinessId =
        businessId ??
        (Number.isFinite(headerBusinessId) && headerBusinessId > 0 ? headerBusinessId : undefined)

      const now = DateTime.local()
      const resolvedStartDate = startDate ?? now.startOf('month').toISODate()!
      const resolvedEndDate = endDate ?? now.endOf('month').toISODate()!

      const sales = await SaleRepository.overview({
        businessId: resolvedBusinessId,
        status,
        startDate: resolvedStartDate,
        endDate: resolvedEndDate,
      })

      const serialized = sales.map((sale) => serializeSale(sale.serialize() as any))
      const summary = buildSalesOverview(serialized as Array<Record<string, unknown>>)

      return response.status(200).json({
        message: i18n.formatMessage(
          'messages.fetch_successful',
          {},
          'Resumen de ventas obtenido exitosamente'
        ),
        range: {
          startDate: resolvedStartDate,
          endDate: resolvedEndDate,
        },
        status: status ?? null,
        ...summary,
      })
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.fetch_error', {}, 'Error al obtener resumen de ventas'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async index(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'view')

    const { request, response, i18n } = ctx

    try {
      const { page, perPage, text, status, businessId } =
        await request.validateUsing(saleIndexValidator)

      const headerBusinessId = Number(request.header('Business'))
      const resolvedBusinessId =
        businessId ??
        (Number.isFinite(headerBusinessId) && headerBusinessId > 0 ? headerBusinessId : undefined)

      const sales = await SaleRepository.index({
        page,
        perPage,
        text,
        status,
        businessId: resolvedBusinessId,
      })

      return response.status(200).json({
        message: i18n.formatMessage(
          'messages.fetch_successful',
          {},
          'Ventas obtenidas exitosamente'
        ),
        data: serializeSaleCollection(
          typeof (sales as any).serialize === 'function' ? (sales as any).serialize() : sales
        ),
      })
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.fetch_error', {}, 'Error al obtener ventas'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async store(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'create')

    const { request, response, auth, i18n } = ctx

    try {
      const payload = await request.validateUsing(saleStoreValidator)
      const document = await buildSaleDocumentPayload(request)

      const headerBusinessId = Number(request.header('Business'))
      const resolvedBusinessId =
        payload.businessId ??
        (Number.isFinite(headerBusinessId) && headerBusinessId > 0 ? headerBusinessId : undefined)

      if (!resolvedBusinessId) {
        return response
          .status(400)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.invalid_format', {}, 'Empresa invalida'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      const sale = await SaleService.create({
        businessId: resolvedBusinessId,
        createdById: auth.user!.id,
        clientId: payload.clientId,
        budgetId: payload.budgetId,
        serviceEntrySheetId: payload.serviceEntrySheetId ?? payload.service_entry_sheet_id,
        document,
        billNumber: payload.billNumber,
        title: payload.title,
        description: payload.description,
        saleDate: payload.saleDate,
        status: payload.status,
        currencyId: payload.currencyId ?? payload.coinId,
        totalAmount: payload.totalAmount,
        utility: payload.utility,
        metadata: payload.metadata,
        banks: payload.banks,
        details: payload.details,
      })

      try {
        const type = await NotificationType.findBy('code', 'sale_created')
        if (type) {
          await NotificationService.createAndDispatch({
            typeId: type.id,
            businessId: resolvedBusinessId,
            title: `Venta creada #${sale.id}`,
            body: `Nueva venta registrada${sale.title ? `: ${sale.title}` : ''}`,
            payload: {
              saleId: sale.id,
              businessId: resolvedBusinessId,
              status: sale.status,
              totalAmount: sale.totalAmount,
            },
            meta: {
              saleId: sale.id,
              source: 'sales',
              action: 'created',
            },
            createdById: auth.user!.id,
          })
        }
      } catch (notifyError) {
        console.log('Sale created notification error:', notifyError)
      }

      return response.status(201).json({
        sale: serializeSale(sale.serialize() as any),
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.store_error', {}, 'Error al guardar venta'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async show(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'view')

    const { params, request, response, i18n } = ctx

    try {
      const { id } = await saleIdParamValidator.validate(params)

      const headerBusinessId = Number(request.header('Business'))
      const resolvedBusinessId =
        Number.isFinite(headerBusinessId) && headerBusinessId > 0 ? headerBusinessId : undefined

      const sale = await SaleRepository.findById(id, resolvedBusinessId)

      if (!sale) {
        return response
          .status(404)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.no_exist', {}, 'Venta no existe'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      return response.status(200).json(serializeSale(sale.serialize() as any))
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.fetch_error', {}, 'Error al obtener venta'),
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

    try {
      const sale = await Sale.query()
        .where('token', token)
        .whereNull('deleted_at')
        .preload('business', (q) =>
          q.select(['id', 'name', 'url', 'url_short', 'email', 'identify'])
        )
        .preload('client', (q) => q.select(['id', 'name', 'identify', 'email', 'address', 'phone']))
        .preload('budget' as any, (q: any) =>
          q.select(['id', 'nro', 'client_id', 'status', 'enabled'])
        )
        .preload('shopping', (q) => {
          q.select(['id', 'nro', 'provider_id', 'enabled', 'is_authorized'])
          q.preload('provider', (providerQ) => providerQ.select(['id', 'name', 'email']))
        })
        .preload('createdBy', (builder) => {
          builder
            .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
            .select(['id', 'personal_data_id', 'email'])
        })
        .preload('currency', (q) => q.select(['id', 'symbol', 'name']))
        .preload('details', (q) =>
          q.preload('product', (pq) => pq.select(['id', 'name', 'amount']))
        )
        .preload('payments', (q: any) =>
          q.whereNull('deleted_at').orderBy('date', 'desc').preload('coin').preload('ledgerMovement')
        )
        .first()

      if (!sale) {
        return response
          .status(404)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.no_exist', {}, 'Venta no existe'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      return response.status(200).json(serializeSalePublic(sale.serialize() as any))
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.fetch_error', {}, 'Error al obtener venta'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async update(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'update')

    const { params, request, response, i18n } = ctx

    try {
      const { id } = await saleIdParamValidator.validate(params)
      const payload = await request.validateUsing(saleUpdateValidator)
      const document = await buildSaleDocumentPayload(request)

      const headerBusinessId = Number(request.header('Business'))
      const resolvedBusinessId =
        Number.isFinite(headerBusinessId) && headerBusinessId > 0 ? headerBusinessId : undefined

      if (document) {
        const currentSaleQuery = Sale.query().where('id', id).whereNull('deleted_at')
        if (resolvedBusinessId !== undefined) {
          currentSaleQuery.where('business_id', resolvedBusinessId)
        }
        const currentSale = await currentSaleQuery.first()

        await deleteExistingSaleDocument(currentSale)
      }

      const sale = await SaleService.update(
        id,
        {
          clientId: payload.clientId,
          serviceEntrySheetId: payload.serviceEntrySheetId ?? payload.service_entry_sheet_id,
          document,
          billNumber: payload.billNumber,
          title: payload.title,
          description: payload.description,
          saleDate: payload.saleDate,
          status: payload.status,
          currencyId: payload.currencyId ?? payload.coinId,
          totalAmount: payload.totalAmount,
          utility: payload.utility,
          metadata: payload.metadata,
          banks: payload.banks,
          details: payload.details,
        },
        resolvedBusinessId
      )

      return response.status(200).json({
        sale: serializeSale(sale.serialize() as any),
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.update_error', {}, 'Error al actualizar venta'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async changeClient(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'update')

    const { params, request, response, i18n } = ctx

    try {
      const { id } = await saleIdParamValidator.validate(params)
      const { clientId } = await request.validateUsing(saleChangeClientValidator)

      const headerBusinessId = Number(request.header('Business'))
      const resolvedBusinessId =
        Number.isFinite(headerBusinessId) && headerBusinessId > 0 ? headerBusinessId : undefined

      const sale = await SaleService.update(id, { clientId }, resolvedBusinessId)

      return response.status(200).json({
        sale: serializeSale(sale.serialize() as any),
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.update_error', {}, 'Error al cambiar cliente de venta'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async associate(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'update')

    const { params, request, response, i18n } = ctx

    try {
      const { id } = await saleIdParamValidator.validate(params)
      const payload = await request.validateUsing(saleAssociateValidator)
      const rawPayload = request.all()

      const hasBudgetField = 'budgetId' in rawPayload || 'budget_id' in rawPayload
      const hasServiceEntrySheetField =
        'serviceEntrySheetId' in rawPayload || 'service_entry_sheet_id' in rawPayload

      if (!hasBudgetField && !hasServiceEntrySheetField) {
        return response
          .status(400)
          .json(
            MessageFrontEnd(
              i18n.formatMessage(
                'messages.invalid_format',
                {},
                'Debe enviar al menos un presupuesto o una HES para asociar a la venta'
              ),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      const normalizedBudgetId = payload.budgetId ?? payload.budget_id ?? null
      const normalizedServiceEntrySheetId =
        payload.serviceEntrySheetId ?? payload.service_entry_sheet_id ?? null

      const headerBusinessId = Number(request.header('Business'))
      const resolvedBusinessId =
        Number.isFinite(headerBusinessId) && headerBusinessId > 0 ? headerBusinessId : undefined

      const sale = await SaleService.update(
        id,
        {
          budgetId: hasBudgetField ? normalizedBudgetId : undefined,
          serviceEntrySheetId: hasServiceEntrySheetField ? normalizedServiceEntrySheetId : undefined,
        },
        resolvedBusinessId
      )

      return response.status(200).json({
        sale: serializeSale(sale.serialize() as any),
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.update_error', {}, 'Error al asociar documentos de venta'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async sendEmailToClient(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'view')

    const { params, request, response, i18n } = ctx

    try {
      const { id } = await saleIdParamValidator.validate(params)
      const { email } = await request.validateUsing(saleSendEmailValidator)

      const headerBusinessId = Number(request.header('Business'))
      const resolvedBusinessId =
        Number.isFinite(headerBusinessId) && headerBusinessId > 0 ? headerBusinessId : undefined

      const sale = await SaleRepository.findById(id, resolvedBusinessId)

      if (!sale) {
        return response
          .status(404)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.no_exist', {}, 'Venta no existe'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      if (!sale.token) {
        sale.token = Util.generateToken(24)
        await sale.save()
      }

      const recipientEmail = email || sale.client?.email
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

      const clientName = sale.client?.name || ''
      const saleNumber = String(sale.id)
      const saleDate = sale.saleDate ? sale.saleDate.toFormat('dd/MM/yyyy') : '---'
      const businessName = sale.business?.name || ''
      const currencySymbol = sale.currency?.symbol || ''
      const totalAmount =
        sale.totalAmount !== null && sale.totalAmount !== undefined
          ? `${currencySymbol}${sale.totalAmount}`
          : '---'
      const host =
        env.get('NODE_ENV') === 'development'
          ? 'http://212.38.95.163/sigmig/'
          : 'https://admin.serviciosgenessis.com/'
      const saleUrl = host + `client/sale/${sale.token}`

      const subject = i18n.formatMessage('messages.sale_email_subject', {
        saleNumber,
      })
      const body = i18n.formatMessage('messages.sale_email_body', {
        clientName,
        saleNumber,
        saleDate,
        businessName,
        totalAmount,
      })

      await mail.sendLater((message) => {
        message
          .to(recipientEmail)
          .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
          .subject(subject)
          .htmlView('emails/sale_client', {
            subject,
            body,
            saleNumber,
            saleDate,
            totalAmount,
            businessName,
            title: sale.title || '---',
            saleUrl,
            saleNumberLabel: i18n.formatMessage('messages.sale_number', {}, 'Sale Number'),
            saleDateLabel: i18n.formatMessage('messages.sale_date', {}, 'Sale Date'),
            totalAmountLabel: i18n.formatMessage('messages.total_amount', {}, 'Total Amount'),
            businessLabel: i18n.formatMessage('messages.business'),
            titleLabel: i18n.formatMessage('messages.title', {}, 'Title'),
            viewSaleLabel: i18n.formatMessage('messages.view_sale', {}, 'View Sale'),
          })
      })

      return response
        .status(200)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.email_send_ok'),
            i18n.formatMessage('messages.ok_title')
          )
        )
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.email_send_error'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async storePayment(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'update')

    const { request, response, i18n } = ctx

    try {
      const payload = await request.validateUsing(salePaymentStoreValidator)
      const businessId = Number(request.header('Business'))

      const result = await SalePaymentService.create({
        saleId: payload.saleId,
        businessId: Number.isFinite(businessId) && businessId > 0 ? businessId : undefined,
        accountId: payload.accountId,
        costCenterId: payload.costCenterId,
        date: payload.date,
        dueDate: payload.dueDate,
        amount: payload.amount,
        currencyId: payload.currencyId ?? payload.coinId,
        paymentMethodId: payload.paymentMethodId,
        documentTypeId: payload.documentTypeId,
        documentNumber: payload.documentNumber,
        concept: payload.concept,
        status: payload.status,
        isProjected: payload.isProjected,
        receivedAt: payload.receivedAt,
        invoiced: payload.invoiced,
        invoiceMeta: payload.invoiceMeta,
      })

      return response.status(201).json({
        ...result,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.store_error', {}, 'Error al guardar pago de venta'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async showPayment(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'view')

    const { params, response, i18n } = ctx

    try {
      const { id } = await saleIdParamValidator.validate(params)
      const result = await SalePaymentService.findWithLedgerMovement(id)
      return response.status(200).json(result)
    } catch (error) {
      console.error(error)
      return response
        .status(404)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.no_exist', {}, 'Pago de venta no existe'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async updatePayment(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'update')

    const { params, request, response, i18n } = ctx

    try {
      const { id } = await saleIdParamValidator.validate(params)
      const payload = await request.validateUsing(salePaymentUpdateValidator)
      const result = await SalePaymentService.update(id, {
        accountId: payload.accountId,
        costCenterId: payload.costCenterId,
        clientId: payload.clientId,
        date: payload.date,
        dueDate: payload.dueDate,
        amount: payload.amount,
        currencyId: payload.currencyId ?? payload.coinId,
        paymentMethodId: payload.paymentMethodId,
        documentTypeId: payload.documentTypeId,
        documentNumber: payload.documentNumber,
        concept: payload.concept,
        status: payload.status,
        isProjected: payload.isProjected,
        receivedAt: payload.receivedAt,
        invoiced: payload.invoiced,
        invoiceMeta: payload.invoiceMeta,
      })

      return response.status(200).json({
        ...result,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.update_error', {}, 'Error al actualizar pago de venta'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async deletePayment(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'delete')

    const { params, response, i18n, auth } = ctx

    try {
      const { id } = await saleIdParamValidator.validate(params)
      await SalePaymentService.delete(id, auth.user?.id)
      return response
        .status(200)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.delete_ok'),
            i18n.formatMessage('messages.ok_title')
          )
        )
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.delete_error', {}, 'Error al eliminar pago de venta'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async voidPayment(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'update')

    const { params, response, i18n } = ctx

    try {
      const { id } = await saleIdParamValidator.validate(params)
      const result = await SalePaymentService.void(id)
      return response.status(200).json({
        ...result,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.update_error', {}, 'Error al anular pago de venta'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async settlePayment(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'update')

    const { params, request, response, i18n } = ctx

    try {
      const { id } = await saleIdParamValidator.validate(params)
      const { documentNumber, documentTypeId } = await request.validateUsing(
        salePaymentSettleValidator
      )

      const result = await SalePaymentService.settle(id, documentNumber, documentTypeId)
      return response.status(200).json({
        ...result,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.update_error', {}, 'Error al liquidar pago de venta'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async updateStatus(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'update')

    const { params, request, response, i18n, auth } = ctx

    try {
      const { id } = await saleIdParamValidator.validate(params)
      const { status } = await request.validateUsing(saleUpdateStatusValidator)

      const headerBusinessId = Number(request.header('Business'))
      const resolvedBusinessId =
        Number.isFinite(headerBusinessId) && headerBusinessId > 0 ? headerBusinessId : undefined

      const sale = await SaleService.updateStatus(id, status, resolvedBusinessId)

      try {
        const type = await NotificationType.findBy('code', 'sale_status_changed')
        if (type) {
          await NotificationService.createAndDispatch({
            typeId: type.id,
            businessId: resolvedBusinessId,
            title: `Estado de venta actualizado #${sale.id}`,
            body: `La venta #${sale.id} cambió a estado ${sale.status}`,
            payload: {
              saleId: sale.id,
              businessId: resolvedBusinessId,
              status: sale.status,
            },
            meta: {
              saleId: sale.id,
              source: 'sales',
              action: 'status_changed',
            },
            createdById: auth.user!.id,
          })
        }
      } catch (notifyError) {
        console.log('Sale status notification error:', notifyError)
      }

      return response.status(200).json({
        sale: serializeSale(sale.serialize() as any),
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.update_error', {}, 'Error al actualizar venta'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async delete(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'delete')

    const { params, request, response, i18n } = ctx

    try {
      const { id } = await saleIdParamValidator.validate(params)

      const headerBusinessId = Number(request.header('Business'))
      const resolvedBusinessId =
        Number.isFinite(headerBusinessId) && headerBusinessId > 0 ? headerBusinessId : undefined

      await SaleService.delete(id, resolvedBusinessId)

      return response
        .status(200)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.delete_ok'),
            i18n.formatMessage('messages.ok_title')
          )
        )
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.delete_error', {}, 'Error al eliminar venta'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async issueElectronicBilling(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'update')

    const { params, request, response, i18n } = ctx

    try {
      const { id } = await saleIdParamValidator.validate(params)
      const headerBusinessId = Number(request.header('Business'))
      const resolvedBusinessId =
        Number.isFinite(headerBusinessId) && headerBusinessId > 0 ? headerBusinessId : undefined

      const sale = await SaleService.issueElectronicBilling(id, resolvedBusinessId)

      return response.status(200).json({
        sale: serializeSale(sale.serialize() as any),
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.update_error', {}, 'Error al emitir facturacion electronica'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async electronicBillingStatus(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'view')

    const { params, request, response, i18n } = ctx

    try {
      const { id } = await saleIdParamValidator.validate(params)
      const headerBusinessId = Number(request.header('Business'))
      const resolvedBusinessId =
        Number.isFinite(headerBusinessId) && headerBusinessId > 0 ? headerBusinessId : undefined

      const status = await SaleService.getElectronicBillingStatus(id, resolvedBusinessId)

      return response.status(200).json({
        saleId: id,
        electronicBilling: status,
      })
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.fetch_error', {}, 'Error al consultar facturacion electronica'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }
}

function serializeSalePublic(sale: Record<string, any>) {
  const serialized = serializeSale(sale)

  return {
    id: serialized.id,
    billNumber: serialized.billNumber ?? serialized.bill_number ?? null,
    title: serialized.title,
    description: serialized.description,
    saleDate: resolvePublicSaleDate(serialized, sale),
    status: serialized.status,
    totalAmount: serialized.totalAmount,
    utility: serialized.utility,
    currency: serialized.currency,
    business: serialized.business,
    client: serialized.client,
    budget: serialized.budget,
    shopping: serialized.shopping,
    createdBy: serialized.createdBy,
    details: serialized.details,
    payments: serialized.payments,
    banks: serialized.banks,
    electronicBilling: serialized.electronicBilling,
    paymentSummary: serialized.paymentSummary,
    financialSummary: serialized.financialSummary,
  }
}

function resolvePublicSaleDate(serialized: Record<string, any>, rawSale: Record<string, any>) {
  if (serialized.saleDate) {
    return serialized.saleDate
  }

  if (rawSale.saleDate) {
    return rawSale.saleDate
  }

  const createdAt = rawSale.createdAt ?? serialized.createdAt
  if (typeof createdAt === 'string') {
    const parsedCreatedAt = DateTime.fromISO(createdAt)
    return parsedCreatedAt.isValid ? parsedCreatedAt.toFormat('yyyy-LL-dd') : null
  }

  if (createdAt instanceof DateTime) {
    return createdAt.toFormat('yyyy-LL-dd')
  }

  return null
}
