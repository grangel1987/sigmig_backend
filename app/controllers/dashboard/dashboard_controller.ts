import Indicator from '#models/settings/indicator'
import BugetRepository from '#repositories/bugets/buget_repository'
import ShoppingRepository from '#repositories/shoppings/shopping_repository'
import PermissionService from '#services/permission_service'
import { searchWithStatusSchema } from '#validators/general'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

export default class DashboardController {
    public async purchaseOrdersMetrics(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'shopping', 'viewReports')
        const { request } = ctx
        const { startDate, endDate } = await request.validateUsing(vine.compile(searchWithStatusSchema))
        const businessId = Number(request.header('Business'))
        const metrics = await ShoppingRepository.metrics(businessId, startDate, endDate)
        return metrics
    }

    public async budgetsMetrics(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'bugets', 'viewReports')
        const { request } = ctx
        const { startDate, endDate, text, budgetStatus } = await request.validateUsing(
            vine.compile(
                vine.object({
                    ...searchWithStatusSchema.getProperties(),
                })
            )
        )
        const businessId = Number(request.header('Business'))
        const metrics = await BugetRepository.metrics(businessId, startDate, endDate, text, budgetStatus)
        return metrics
    }

    public async indicators(ctx: HttpContext) {
        const { request } = ctx
        const { startDate: startDateInput, endDate: endDateInput } = await request.validateUsing(
            vine.compile(
                vine.object({
                    startDate: vine.date().optional(),
                    endDate: vine.date().optional(),
                })
            )
        )

        const toDateTime = (d: any) => {
            if (!d) return null
            if (typeof d === 'string') return DateTime.fromISO(d)
            if (d instanceof Date) return DateTime.fromJSDate(d)
            return DateTime.fromJSDate(new Date(d))
        }

        let start = toDateTime(startDateInput)
        let end = toDateTime(endDateInput)

        if (!start || !end) {
            // default: last month until now
            end = DateTime.local()
            start = end.minus({ months: 1 })
        }

        const indicators = await Indicator.query()
            .whereBetween('date', [start.toSQL({ includeOffset: false })!, end.toSQL({ includeOffset: false })!])
            .orderBy('date', 'asc')

        const rows = indicators.map((i) => i.serialize())

        const numericFields = ['uf', 'utm', 'dolar', 'euro']

        const stats: Record<string, any> = {}

        const round = (n: number | null) => (n === null ? null : Math.round(n * 10000) / 10000)

        for (const field of numericFields) {
            const values = rows
                .map((r: any) => ({ date: DateTime.fromJSDate(r.date).toFormat('yyyy-MM-dd'), value: Number(r[field]) }))
                .filter((v: any) => !Number.isNaN(v.value))

            if (values.length === 0) {
                stats[field] = null
                continue
            }

            const nums = values.map((v: any) => v.value)
            const sum = nums.reduce((s: number, x: number) => s + x, 0)
            const first = values[0].value
            const last = values[values.length - 1].value
            const changePercent = first !== 0 ? ((last - first) / first) * 100 : null

            stats[field] = {
                min: round(Math.min(...nums)),
                max: round(Math.max(...nums)),
                avg: round(sum / nums.length),
                first: round(first),
                last: round(last),
                changePercent: changePercent === null ? null : round(changePercent),
                samples: values.length,
            }
        }

        return {
            data: rows,
            stats,
            range: { start: start.toISODate(), end: end.toISODate(), count: rows.length },
        }
    }

    public async pendingPurchaseOrders(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'shopping', 'view')
        const { request } = ctx
        const { page, perPage, startDate, endDate } = await request.validateUsing(vine.compile(searchWithStatusSchema))
        const businessId = Number(request.header('Business'))
        const data = await ShoppingRepository.pending(businessId, startDate, endDate, page, perPage)
        if ((data as any).getMeta) {
            const paginator = data as any
            return { ...paginator.getMeta(), data: paginator.all().map((d: any) => d.serialize()) }
        }
        return { data: (data as any[]).map((d) => d.serialize()) }
    }

    public async pendingBudgets(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'bugets', 'view')
        const { request } = ctx
        const { page, perPage, startDate, endDate, text } = await request.validateUsing(vine.compile(searchWithStatusSchema))
        const businessId = Number(request.header('Business'))
        const data = await BugetRepository.report(businessId, startDate, endDate, page, perPage, text, 'pending')
        if ((data as any).getMeta) {
            const paginator = data as any
            return { ...paginator.getMeta(), data: paginator.all().map((d: any) => d.serialize()) }
        }
        return { data: (data as any[]).map((d) => d.serialize()) }
    }


}

