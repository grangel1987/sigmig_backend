import Indicator from '#models/settings/indicator'
import BugetRepository from '#repositories/bugets/buget_repository'
import ShoppingRepository from '#repositories/shoppings/shopping_repository'
import PermissionService from '#services/permission_service'
import { searchWithStatusSchema } from '#validators/general'
import { HttpContext } from '@adonisjs/core/http'
import Buget from '#models/bugets/buget'
import Sale from '#models/sales/sale'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

export default class DashboardController {
    public async purchaseOrdersMetrics(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'shopping', 'viewReports')
        const { request } = ctx
        const { startDate, endDate } = await request.validateUsing(vine.compile(searchWithStatusSchema))
        const businessId = Number(request.header('Business') || request.input('businessId'))
        const metrics = await ShoppingRepository.metrics(businessId, startDate, endDate)
        return metrics
    }

    public async budgetsMetrics(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'bugets', 'viewReports')
        const { request } = ctx
        const { startDate, endDate, text, budgetStatus, status } = await request.validateUsing(
            vine.compile(
                vine.object({
                    ...searchWithStatusSchema.getProperties(),
                })
            )
        )
        const businessId = Number(request.header('Business') || request.input('businessId'))
        const enabled = status !== undefined ? status === 'enabled' : undefined
        const metrics = await BugetRepository.metrics(
            businessId,
            startDate,
            endDate,
            text,
            budgetStatus,
            enabled
        )
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
        const businessId = Number(request.header('Business') || request.input('businessId'))
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
        const businessId = Number(request.header('Business') || request.input('businessId'))
        const data = await BugetRepository.report(businessId, startDate, endDate, page, perPage, text, 'pending')
        if ((data as any).getMeta) {
            const paginator = data as any
            return { ...paginator.getMeta(), data: paginator.all().map((d: any) => d.serialize()) }
        }
        return { data: (data as any[]).map((d) => d.serialize()) }
    }

    private async _getReceivablesData(businessId: number, clientId?: number) {
        if (!businessId || Number.isNaN(businessId)) {
            console.log("[DEBUG _getReceivablesData] invalid businessId, returning empty array");
            return []
        }

        // Fetch pending budgets
        const budgetsQuery = Buget.query()
            .where('business_id', businessId)
            .where('enabled', true)
            .where('status', 'pending')
            .preload('client', (q) => q.select('id', 'name', 'identify'))
            .preload('products')
            .preload('items')
            .whereNotExists((latestBudgetQuery) => {
                latestBudgetQuery
                    .from('bugets as newer_bugets')
                    .whereRaw('newer_bugets.business_id = bugets.business_id')
                    .whereRaw('newer_bugets.nro = bugets.nro')
                    .where((newerMatchQuery) => {
                        newerMatchQuery
                            .whereRaw('newer_bugets.created_at > bugets.created_at')
                            .orWhere((sameCreatedAtQuery) => {
                                sameCreatedAtQuery
                                    .whereRaw('newer_bugets.created_at = bugets.created_at')
                                    .whereRaw('newer_bugets.id > bugets.id')
                            })
                    })
            })

        if (clientId) {
            budgetsQuery.where('client_id', clientId)
        }

        const budgets = await budgetsQuery


        // Fetch unpaid/payment_pending sales
        const salesQuery = Sale.query()
            .whereNull('deleted_at')
            .where('business_id', businessId)
            .whereIn('status', ['unpaid', 'payment_pending'])
            .preload('client', (q) => q.select('id', 'name', 'identify'))

        if (clientId) {
            salesQuery.where('client_id', clientId)
        }

        const sales = await salesQuery


        // Group by client
        const clientsMap = new Map<number, any>()

        const getClientGroup = (client: any) => {
            if (!client) return null
            if (!clientsMap.has(client.id)) {
                clientsMap.set(client.id, {
                    client: {
                        id: client.id,
                        name: client.name,
                        identify: client.identify
                    },
                    totalDebt: 0,
                    budgets: [],
                    sales: []
                })
            }
            return clientsMap.get(client.id)
        }

        for (const budget of budgets) {
            if (!budget.client) continue
            const group = getClientGroup(budget.client)
            if (!group) continue
            const amount = budget.getTotalAmount()
            group.totalDebt += amount
            group.budgets.push({
                id: budget.id,
                nro: budget.nro,
                title: budget.info?.name || '',
                issueDate: budget.createdAt ? budget.createdAt.toFormat('yyyy-MM-dd') : null,
                totalAmount: amount
            })
        }

        for (const sale of sales) {
            if (!sale.client) continue
            const group = getClientGroup(sale.client)
            if (!group) continue
            const amount = sale.totalAmount || 0
            group.totalDebt += amount
            group.sales.push({
                id: sale.id,
                billNumber: sale.billNumber,
                title: sale.title || '',
                issueDate: sale.saleDate ? (typeof sale.saleDate === 'string' ? sale.saleDate : sale.saleDate.toFormat('yyyy-MM-dd')) : null,
                totalAmount: amount
            })
        }

        return Array.from(clientsMap.values())
    }

    public async receivables(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'bugets', 'view')
        const { request } = ctx
        const businessId = Number(request.input('businessId') || request.header('Business'))
        const data = await this._getReceivablesData(businessId)
        return { data }
    }

    public async receivablesOverview(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'bugets', 'view')
        const { request } = ctx
        const businessId = Number(request.input('businessId') || request.header('Business'))

        const page = Number(request.input('page', 1))
        const perPage = Number(request.input('perPage', 5))

        const fullData = await this._getReceivablesData(businessId)

        // Return only client info and total debt
        const overviewData = fullData.map((d: any) => ({
            client: d.client,
            totalDebt: d.totalDebt
        }))

        // Sort descending by debt
        overviewData.sort((a, b) => b.totalDebt - a.totalDebt)

        const total = overviewData.length
        const lastPage = Math.ceil(total / perPage) || 1
        const startIndex = (page - 1) * perPage
        const endIndex = startIndex + perPage

        const paginatedData = overviewData.slice(startIndex, endIndex)

        return {
            meta: {
                total,
                perPage,
                currentPage: page,
                lastPage,
                firstPage: 1
            },
            data: paginatedData
        }
    }

    public async clientReceivables(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'bugets', 'view')
        const { request, response } = ctx
        const businessId = Number(request.input('businessId') || request.header('Business'))
        const clientId = Number(request.param('id') || request.input('clientId'))
        
        if (!clientId || Number.isNaN(clientId)) {
             return response.badRequest({ message: 'Client ID is required' })
        }

        const data = await this._getReceivablesData(businessId, clientId)
        
        const clientData = data.length > 0 ? data[0] : null
        return { data: clientData }
    }
}

