import NotificationType from '#models/notifications/notification_type'
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
import MessageFrontEnd from '#utils/MessageFrontEnd'
import {
  saleIdParamValidator,
  saleIndexValidator,
  saleOverviewValidator,
  salePaymentSettleValidator,
  salePaymentStoreValidator,
  salePaymentUpdateValidator,
  saleStoreValidator,
  saleUpdateStatusValidator,
  saleUpdateValidator,
} from '#validators/sale'
import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

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

  public async update(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'sales', 'update')

    const { params, request, response, i18n } = ctx

    try {
      const { id } = await saleIdParamValidator.validate(params)
      const payload = await request.validateUsing(saleUpdateValidator)

      const headerBusinessId = Number(request.header('Business'))
      const resolvedBusinessId =
        Number.isFinite(headerBusinessId) && headerBusinessId > 0 ? headerBusinessId : undefined

      const sale = await SaleService.update(
        id,
        {
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
