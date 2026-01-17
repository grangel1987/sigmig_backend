/* import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { indexFiltersWithStatus } from '#validators/general'
import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

type MessageFrontEndType = {
    message: string
    title: string
}

export default class CashAuditController {
    public async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'cash_audits', 'view')

        const { request, response, i18n } = ctx
        try {
            const { page, perPage, text, status } = await request.validateUsing(indexFiltersWithStatus)

            // TODO: Replace with actual CashAudit model when created
            const baseQuery = {} // CashAudit.query()

            // TODO: Add preloads for relationships
            // .preload('business', (builder) => {
            //   builder.select(['id', 'name'])
            // })
            // .preload('createdBy', (builder) => {
            //   builder.preload('personalData').select(['id', 'email'])
            // })

            // TODO: Add text search filters
            // if (text) {
            //   const like = `%${text}%`
            //   baseQuery.where((qb) => qb.whereRaw('field LIKE ?', [like]))
            // }

            // TODO: Add status filter
            // if (status !== undefined) baseQuery.where('enabled', status === 'enabled')

            // const cashAudits = await (page ? baseQuery.paginate(page, perPage || 10) : baseQuery)

            return response.status(200).json({
                message: 'Cash audits index - implementation pending',
                // data: cashAudits
            })
        } catch (error) {
            console.log(error)
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.fetch_error', {}, 'Error al obtener auditorías'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    public async show(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'cash_audits', 'view')

        const { params, response, i18n } = ctx
        const cashAuditId = params.id

        try {
            // TODO: Replace with actual CashAudit model
            // const cashAudit = await CashAudit.query()
            //   .where('id', cashAuditId)
            //   .preload('business')
            //   .preload('createdBy', (builder) => {
            //     builder.preload('personalData')
            //   })
            //   .firstOrFail()

            return response.status(200).json({
                message: 'Cash audit show - implementation pending',
                // cashAudit
            })
        } catch (error) {
            console.log(error)
            return response.status(404).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.no_exist'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    public async store(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'cash_audits', 'create')

        const { request, response, auth, i18n } = ctx
        // TODO: Create validator
        // const data = await request.validateUsing(cashAuditStoreValidator)
        const data = request.all()
        const dateTime = DateTime.local()

        try {
            // TODO: Replace with actual CashAudit model
            const payload = {
                // Map validator fields to model properties
                ...data,
                createdAt: dateTime,
                updatedAt: dateTime,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
            }

            // const cashAudit = await CashAudit.create(payload)

            // TODO: Load relationships
            // await cashAudit.load('business')
            // await cashAudit.load('createdBy', (builder) => {
            //   builder.preload('personalData')
            // })

            return response.status(201).json({
                message: i18n.formatMessage('messages.store_ok'),
                title: i18n.formatMessage('messages.ok_title'),
                // cashAudit
            } as MessageFrontEndType)
        } catch (error) {
            console.log(error)
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    public async update(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'cash_audits', 'update')

        const { params, request, response, auth, i18n } = ctx
        const cashAuditId = params.id
        // TODO: Create validator
        // const data = await request.validateUsing(cashAuditUpdateValidator)
        const data = request.all()
        const dateTime = DateTime.local()

        try {
            // TODO: Replace with actual CashAudit model
            // const cashAudit = await CashAudit.findOrFail(cashAuditId)

            // const payload: Record<string, unknown> = {}
            // Map optional fields from validator
            // if (data.field !== undefined) payload.field = data.field

            // cashAudit.merge({
            //   ...payload,
            //   updatedAt: dateTime,
            //   updatedById: auth.user!.id,
            // })
            // await cashAudit.save()

            // TODO: Load relationships
            // await cashAudit.load('business')
            // await cashAudit.load('createdBy')
            // await cashAudit.load('updatedBy')

            return response.status(200).json({
                message: i18n.formatMessage('messages.update_ok'),
                title: i18n.formatMessage('messages.ok_title'),
                // cashAudit
            } as MessageFrontEndType)
        } catch (error) {
            console.log(error)
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    public async destroy(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'cash_audits', 'delete')

        const { params, response, auth, i18n } = ctx
        const cashAuditId = params.id
        const dateTime = DateTime.local()

        try {
            // TODO: Replace with actual CashAudit model
            // const cashAudit = await CashAudit.findOrFail(cashAuditId)

            // Soft delete
            // cashAudit.merge({
            //   enabled: false,
            //   updatedAt: dateTime,
            //   updatedById: auth.user!.id,
            // })
            // await cashAudit.save()

            return response.status(200).json({
                message: i18n.formatMessage('messages.delete_ok'),
                title: i18n.formatMessage('messages.ok_title'),
            } as MessageFrontEndType)
        } catch (error) {
            console.log(error)
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.delete_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    public async restore(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'cash_audits', 'update')

        const { params, response, auth, i18n } = ctx
        const cashAuditId = params.id
        const dateTime = DateTime.local()

        try {
            // TODO: Replace with actual CashAudit model
            // const cashAudit = await CashAudit.query()
            //   .where('id', cashAuditId)
            //   .where('enabled', false)
            //   .firstOrFail()

            // cashAudit.merge({
            //   enabled: true,
            //   updatedAt: dateTime,
            //   updatedById: auth.user!.id,
            // })
            // await cashAudit.save()

            return response.status(200).json({
                message: i18n.formatMessage('messages.restore_ok', {}, 'Restaurado exitosamente'),
                title: i18n.formatMessage('messages.ok_title'),
            } as MessageFrontEndType)
        } catch (error) {
            console.log(error)
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.restore_error', {}, 'Error al restaurar'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }
}
 */