import CashAudit from '#models/cash_audit'
import CashAuditLine from '#models/cash_audit_line'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { HttpContext } from '@adonisjs/core/http'
import { ModelPaginator } from '@adonisjs/lucid/orm'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

export default class CashAuditController {
    public async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'cash_audits', 'view')

        const { request, response, i18n } = ctx
        try {
            const { page, perPage, startDate, endDate, date, businessId: pBusinessId } = await request.validateUsing(
                vine.compile(
                    vine.object({
                        page: vine.number().positive().optional(),
                        perPage: vine.number().positive().optional(),
                        startDate: vine.date().optional(),
                        endDate: vine.date().optional(),
                        date: vine.date().optional(),
                        businessId: vine.number().positive().optional(),
                    })
                )
            )

            let businessId = pBusinessId
            if (!businessId) businessId = Number(request.header('Business'))

            let query = CashAudit.query()
                .preload('lines')
                .orderBy('performed_at', 'desc')

            if (businessId) {
                query = query.where('business_id', businessId)
            }

            if (startDate || endDate) {
                query.where((builder) => {
                    if (startDate) {
                        const pStartDate = DateTime.fromJSDate(startDate).toSQLDate()!
                        builder.whereRaw('DATE(performed_at) >= ?', [pStartDate])
                    }
                    if (endDate) {
                        const pEndDate = DateTime.fromJSDate(endDate).toSQLDate()!
                        builder.whereRaw('DATE(performed_at) <= ?', [pEndDate])
                    }
                })
            }

            if (date) {
                const pDate = DateTime.fromJSDate(date).toSQLDate()!
                query = query.whereRaw('DATE(performed_at) = ?', [pDate])
            }

            const cashAudits = await (page ? query.paginate(page, perPage || 10) : query)

            if (cashAudits instanceof ModelPaginator) {
                return response.status(200).json({
                    message: i18n.formatMessage('messages.fetch_successful', {}, 'Auditorías obtenidas exitosamente'),
                    data: cashAudits.all().map((audit) => audit.serialize()),
                    meta: cashAudits.getMeta(),
                })
            }

            return response.status(200).json({
                message: i18n.formatMessage('messages.fetch_successful', {}, 'Auditorías obtenidas exitosamente'),
                data: cashAudits.map((audit) => audit.serialize()),
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
        const cashAuditId = Number(params.id)

        try {
            const cashAudit = await CashAudit.query()
                .where('id', cashAuditId)
                .preload('lines')
                .firstOrFail()

            return response.status(200).json({
                message: i18n.formatMessage('messages.fetch_successful', {}, 'Auditoría obtenida exitosamente'),
                data: cashAudit.serialize(),
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

        const payload = await request.validateUsing(
            vine.compile(
                vine.object({
                    businessId: vine.number().positive().optional(),
                    performedAt: vine.date().optional(),
                    totalCounted: vine.number(),
                    totalExpected: vine.number(),
                    notes: vine.string().trim().nullable().optional(),
                    lines: vine
                        .array(
                            vine.object({
                                currencyId: vine.number().positive().nullable().optional(),
                                denominationValue: vine.number().nullable().optional(),
                                denominationName: vine.string().trim().nullable().optional(),
                                quantity: vine.number().nullable().optional(),
                                amount: vine.number().nullable().optional(),
                                subtotal: vine.number(),
                            })
                        )
                        .optional(),
                })
            )
        )

        const trx = await db.transaction()
        try {
            let businessId = payload.businessId
            if (!businessId) businessId = Number(request.header('Business'))

            if (!businessId) {
                return response.status(400).json({
                    message: i18n.formatMessage('messages.bad_request', {}, 'Business requerido'),
                    title: i18n.formatMessage('messages.error_title'),
                })
            }

            const totalCounted = Number(payload.totalCounted)
            const totalExpected = Number(payload.totalExpected)
            const difference = totalCounted - totalExpected

            const cashAudit = await CashAudit.create(
                {
                    businessId,
                    performedBy: auth.user!.id,
                    performedAt: payload.performedAt
                        ? DateTime.fromJSDate(payload.performedAt)
                        : DateTime.local(),
                    totalCounted,
                    totalExpected,
                    difference,
                    notes: payload.notes ?? null,
                },
                { client: trx }
            )

            if (payload.lines && payload.lines.length > 0) {
                const linesPayload = payload.lines.map((line) => ({
                    currencyId: line.currencyId ?? null,
                    denominationValue: line.denominationValue ?? null,
                    denominationName: line.denominationName ?? null,
                    quantity: line.quantity ?? null,
                    amount: line.amount ?? null,
                    subtotal: line.subtotal,
                }))

                await cashAudit.related('lines').createMany(linesPayload, { client: trx })
            }

            await cashAudit.load('lines')

            await trx.commit()

            return response.status(201).json({
                message: i18n.formatMessage('messages.store_ok'),
                title: i18n.formatMessage('messages.ok_title'),
                data: cashAudit.serialize(),
            })
        } catch (error) {
            await trx.rollback()
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

        const { params, request, response, i18n } = ctx
        const cashAuditId = Number(params.id)

        const payload = await request.validateUsing(
            vine.compile(
                vine.object({
                    performedAt: vine.date().optional(),
                    totalCounted: vine.number().optional(),
                    totalExpected: vine.number().optional(),
                    notes: vine.string().trim().nullable().optional(),
                    lines: vine
                        .array(
                            vine.object({
                                currencyId: vine.number().positive().nullable().optional(),
                                denominationValue: vine.number().nullable().optional(),
                                denominationName: vine.string().trim().nullable().optional(),
                                quantity: vine.number().nullable().optional(),
                                amount: vine.number().nullable().optional(),
                                subtotal: vine.number(),
                            })
                        )
                        .optional(),
                })
            )
        )

        const trx = await db.transaction()
        try {
            const cashAudit = await CashAudit.findOrFail(cashAuditId, { client: trx })

            if (payload.performedAt) {
                cashAudit.performedAt = DateTime.fromJSDate(payload.performedAt)
            }

            if (payload.totalCounted !== undefined) {
                cashAudit.totalCounted = Number(payload.totalCounted)
            }

            if (payload.totalExpected !== undefined) {
                cashAudit.totalExpected = Number(payload.totalExpected)
            }

            if (payload.totalCounted !== undefined || payload.totalExpected !== undefined) {
                cashAudit.difference = Number(cashAudit.totalCounted) - Number(cashAudit.totalExpected)
            }

            if (payload.notes !== undefined) {
                cashAudit.notes = payload.notes ?? null
            }

            await cashAudit.save()

            if (payload.lines) {
                await CashAuditLine.query({ client: trx })
                    .where('cash_audit_id', cashAudit.id)
                    .delete()

                if (payload.lines.length > 0) {
                    const linesPayload = payload.lines.map((line) => ({
                        currencyId: line.currencyId ?? null,
                        denominationValue: line.denominationValue ?? null,
                        denominationName: line.denominationName ?? null,
                        quantity: line.quantity ?? null,
                        amount: line.amount ?? null,
                        subtotal: line.subtotal,
                    }))

                    await cashAudit.related('lines').createMany(linesPayload, { client: trx })
                }
            }

            await cashAudit.load('lines')

            await trx.commit()

            return response.status(200).json({
                message: i18n.formatMessage('messages.update_ok'),
                title: i18n.formatMessage('messages.ok_title'),
                data: cashAudit.serialize(),
            })
        } catch (error) {
            await trx.rollback()
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

        const { params, response, i18n } = ctx
        const cashAuditId = Number(params.id)

        try {
            const cashAudit = await CashAudit.findOrFail(cashAuditId)
            await cashAudit.delete()

            return response.status(200).json({
                message: i18n.formatMessage('messages.delete_ok'),
                title: i18n.formatMessage('messages.ok_title'),
            })
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

        const { response, i18n } = ctx

        return response.status(400).json({
            message: i18n.formatMessage('messages.bad_request', {}, 'Restauración no soportada'),
            title: i18n.formatMessage('messages.error_title'),
        })
    }
}
