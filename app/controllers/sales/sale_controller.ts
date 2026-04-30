import NotificationType from '#models/notifications/notification_type'
import SaleRepository from '#repositories/sales/sale_repository'
import NotificationService from '#services/notification_service'
import PermissionService from '#services/permission_service'
import SaleService from '#services/sale_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import {
    saleIdParamValidator,
    saleIndexValidator,
    saleStoreValidator,
    saleUpdateStatusValidator,
} from '#validators/sale'
import { HttpContext } from '@adonisjs/core/http'

export default class SaleController {
    public async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'sales', 'view')

        const { request, response, i18n } = ctx

        try {
            const { page, perPage, text, status, businessId } = await request.validateUsing(saleIndexValidator)

            const headerBusinessId = Number(request.header('Business'))
            const resolvedBusinessId =
                businessId ?? (Number.isFinite(headerBusinessId) && headerBusinessId > 0 ? headerBusinessId : undefined)

            const sales = await SaleRepository.index({
                page,
                perPage,
                text,
                status,
                businessId: resolvedBusinessId,
            })

            return response.status(200).json({
                message: i18n.formatMessage('messages.fetch_successful', {}, 'Ventas obtenidas exitosamente'),
                data: sales,
            })
        } catch (error) {
            console.error(error)
            return response.status(500).json(
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
                return response.status(400).json(
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
                currencyId: payload.currencyId,
                totalAmount: payload.totalAmount,
                metadata: payload.metadata,
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
                sale,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_ok'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            console.error(error)
            return response.status(500).json(
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
                return response.status(404).json(
                    MessageFrontEnd(
                        i18n.formatMessage('messages.no_exist', {}, 'Venta no existe'),
                        i18n.formatMessage('messages.error_title')
                    )
                )
            }

            return response.status(200).json(sale)
        } catch (error) {
            console.error(error)
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.fetch_error', {}, 'Error al obtener venta'),
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
                sale,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_ok'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            console.error(error)
            return response.status(500).json(
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

            return response.status(200).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.delete_ok'),
                    i18n.formatMessage('messages.ok_title')
                )
            )
        } catch (error) {
            console.error(error)
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.delete_error', {}, 'Error al eliminar venta'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }
}
