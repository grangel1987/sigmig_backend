import SettingBugetItem from '#models/buget/setting_buget_item'
import Buget from '#models/bugets/buget'
import Database from '@adonisjs/lucid/services/db'
import { ModelPaginatorContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'

export default class BugetRepository {
  // Find budgets by client name for a business
  public static async findByNameClient(
    businessId: number,
    name: string,
    page?: number,
    limit?: number,
    status?: 'disabled' | 'enabled',
    budgetStatus?: 'pending' | 'revision' | 'reject' | 'accept'
  ) {
    let query = Buget.query()
      .where('business_id', businessId)
      .whereHas('client', (CQuery) => {
        CQuery.whereRaw('clients.name LIKE ?', [`%${name}%`])
      })
      .preload('client', (q) => q.preload('city').preload('typeIdentify'))
      .orderBy('created_at', 'desc')

    if (status !== undefined) query = query.where('bugets.enabled', status === 'enabled')

    if (budgetStatus) query = query.where('bugets.status', budgetStatus)

    if (page && limit) {
      return await query.paginate(page, limit)
    }

    return await query
  }

  // Find budgets by creation date for a business
  public static async findByDate(
    businessId: number,
    date: string,
    page?: number,
    limit?: number,
    status?: 'disabled' | 'enabled',
    budgetStatus?: 'pending' | 'revision' | 'reject' | 'accept'
  ) {
    const today = DateTime.now().toSQLDate()
    const tomorrow = DateTime.now().plus({ days: 1 }).toSQLDate()

    let query = Buget.query()
      .where('business_id', businessId)
      .preload('client', (q) => q.preload('city').preload('typeIdentify'))
      .orderBy('created_at', 'desc')

    if (date === today) {
      // If date is today, query for range between today and tomorrow
      query = query.whereRaw('DATE(created_at) BETWEEN ? AND ?', [today, tomorrow])
    } else {
      // Otherwise, query for exact date
      query = query.whereRaw('DATE(created_at) = ?', [date])
    }

    if (status) query = query.where('bugets.enabled', status === 'enabled')

    if (budgetStatus) query = query.where('bugets.status', budgetStatus)

    if (page && limit) {
      return await query.paginate(page, limit)
    }

    return await query
  }

  public static async report(
    businessId: number,
    dateInitial?: Date,
    dateEnd?: Date,
    page?: number,
    limit?: number,
    text?: string,
    budgetStatus?: 'pending' | 'revision' | 'reject' | 'accept',
    enabled?: boolean
  ): Promise<ModelPaginatorContract<Buget> | Buget[]> {
    const start = dateInitial ? DateTime.fromJSDate(dateInitial).toSQLDate()! : '1970-01-01'
    const end = dateEnd ? DateTime.fromJSDate(dateEnd).toSQLDate()! : '9999-12-31'

    let bgtQ = Buget.query()
      .where('business_id', businessId)
      .whereRaw('DATE(created_at) BETWEEN ? AND ?', [start, end])
      .preload('client', (q) => q.preload('city').preload('typeIdentify'))
      .preload('createdBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })
      .preload('updatedBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })
      .orderBy('created_at', 'desc')

    if (budgetStatus) {
      bgtQ = bgtQ.where('bugets.status', budgetStatus)
    }
    if (enabled !== undefined) {
      bgtQ = bgtQ.where('bugets.enabled', enabled)
    }

    if (text) {
      bgtQ = bgtQ.where((qb) => {
        qb.whereRaw('nro LIKE ?', [`${text}%`]).orWhereHas('client', (cq) =>
          cq.whereRaw('name LIKE ?', [`%${text}%`])
        )
      })
    }

    console.log(bgtQ.toQuery())

    if (page && limit) {
      return await bgtQ.paginate(page, limit)
    }

    const bugets = await bgtQ

    return bugets
  }

  public static async searchItems(
    type_id?: number,
    category_id?: number,
    params?: string,
    businessId?: number
  ) {
    const query = SettingBugetItem.query()
      .select(['id', 'value', 'type_id', 'with_title', 'title'])
      .where('enabled', true)
      .whereNull('deleted_at')

    if (type_id) {
      query.where('type_id', type_id)
    }

    if (category_id) {
      query.where('category_id', category_id)
    }

    if (params) {
      const likeVal = `%${params}%`
      query.where((qb) => {
        qb.whereRaw('value LIKE ?', [likeVal]).orWhereRaw('title LIKE ?', [likeVal])
      })
    }

    if (businessId) {
      query.where((qb) => {
        qb.whereExists((sub) => {
          sub
            .from('business_setting_buget_items')
            .whereColumn(
              'business_setting_buget_items.setting_buget_item_id',
              'setting_buget_items.id'
            )
            .where('business_setting_buget_items.business_id', businessId)
        }).orWhereNotExists((sub) => {
          sub
            .from('business_setting_buget_items')
            .whereColumn(
              'business_setting_buget_items.setting_buget_item_id',
              'setting_buget_items.id'
            )
        })
      })
    } else {
      query.whereNotExists((sub) => {
        sub
          .from('business_setting_buget_items')
          .whereColumn(
            'business_setting_buget_items.setting_buget_item_id',
            'setting_buget_items.id'
          )
      })
    }

    const result = await query

    return result
  }

  public static async metrics(
    businessId: number,
    dateInitial?: Date,
    dateEnd?: Date,
    text?: string,
    budgetStatus?: 'pending' | 'revision' | 'reject' | 'accept'
  ): Promise<{
    counts: Record<string, number>
    money: { productsTotal: number; discountsTotal: number; utilityTotal: number; total: number }
    clients: Array<{
      client: string
      count: number
      productsTotal: number
      discountsTotal: number
      utilityTotal: number
      total: number
    }>
  }> {
    const start = dateInitial ? DateTime.fromJSDate(dateInitial).toSQLDate()! : '1970-01-01'
    const end = dateEnd ? DateTime.fromJSDate(dateEnd).toSQLDate()! : '9999-12-31'
    // Aggregate products total, discounts and utility using query builder
    const totalsRow = (await Database.from('bugets')
      .leftJoin('buget_products as bp', 'bp.buget_id', 'bugets.id')
      .where('bugets.business_id', businessId)
      .whereRaw('DATE(bugets.created_at) BETWEEN ? AND ?', [start, end])
      .select(
        Database.raw('IFNULL(SUM(bp.amount * bp.count), 0) AS products_total'),
        Database.raw('IFNULL(SUM(bugets.discount), 0) AS discounts_total'),
        Database.raw('IFNULL(SUM(bugets.utility), 0) AS utility_total')
      )
      .first()) ?? { products_total: 0, discounts_total: 0, utility_total: 0 }

    // Build base counts query
    let countsQuery = Database.from('bugets')
      .where('business_id', businessId)
      .whereRaw('DATE(created_at) BETWEEN ? AND ?', [start, end])

    if (budgetStatus) {
      countsQuery = countsQuery.where('status', budgetStatus)
    }

    if (text) {
      countsQuery = countsQuery.where((qb) => {
        qb.whereRaw('nro LIKE ?', [`${text}%`]).orWhereExists((sub) => {
          sub
            .from('clients')
            .whereRaw('clients.id = bugets.client_id')
            .whereRaw('clients.name LIKE ?', [`%${text}%`])
        })
      })
    }

    const countsRows =
      (await countsQuery.select('status').count('* as cnt').groupBy('status')) ?? []

    const counts: Record<string, number> = {
      pending: 0,
      revision: 0,
      reject: 0,
      accept: 0,
      other: 0,
    }
    for (const r of countsRows as Array<{ status: string | null; cnt: number }>) {
      const key = r.status ?? 'other'
      if (Object.hasOwn(counts, key)) counts[key] = Number(r.cnt)
      else counts.other += Number(r.cnt)
    }

    // Build a subquery that computes totals per buget (one row per buget)
    const bugetTotalsSubQuery = Database.from('bugets as b')
      .leftJoin('buget_products as bp', 'bp.buget_id', 'b.id')
      .where('b.business_id', businessId)
      .whereRaw('DATE(b.created_at) BETWEEN ? AND ?', [start, end])
      .select(
        'b.id as buget_id',
        'b.client_id',
        Database.raw('IFNULL(SUM(bp.amount * bp.count), 0) as products_total'),
        Database.raw('IFNULL(b.discount, 0) as discounts_total'),
        Database.raw('IFNULL(b.utility, 0) as utility_total')
      )
      .groupBy('b.id')

    // Apply optional filters to the buget-level subquery
    if (budgetStatus) {
      bugetTotalsSubQuery.where('b.status', budgetStatus)
    }
    if (text) {
      bugetTotalsSubQuery.where((qb) => {
        qb.whereRaw('b.nro LIKE ?', [`${text}%`]).orWhereExists((sub) => {
          sub
            .from('clients')
            .whereRaw('clients.id = b.client_id')
            .whereRaw('clients.name LIKE ?', [`%${text}%`])
        })
      })
    }

    const clientRows = await Database.from(bugetTotalsSubQuery.as('t'))
      .join('clients as c', 'c.id', 't.client_id')
      .select(
        'c.name as client',
        Database.raw('COUNT(*) as cnt'),
        Database.raw('IFNULL(SUM(t.products_total),0) as products_total'),
        Database.raw('IFNULL(SUM(t.discounts_total),0) as discounts_total'),
        Database.raw('IFNULL(SUM(t.utility_total),0) as utility_total')
      )
      .groupBy('c.name')
      .orderByRaw('cnt desc')

    const clients: Array<{
      client: string
      count: number
      productsTotal: number
      discountsTotal: number
      utilityTotal: number
      total: number
    }> = (clientRows as Array<any>).map((r) => {
      const productsTotal = Math.trunc((r.products_total ?? 0) * 100) / 100
      const discountsTotal = Math.trunc((r.discounts_total ?? 0) * 100) / 100
      const utilityTotal = Math.trunc((r.utility_total ?? 0) * 100) / 100
      const total = Math.trunc((productsTotal + utilityTotal - discountsTotal) * 100) / 100
      return {
        client: r.client,
        count: Number(r.cnt),
        productsTotal,
        discountsTotal,
        utilityTotal,
        total,
      }
    })

    const productsTotal = Math.trunc(totalsRow.products_total * 100) / 100
    const discountsTotal = Math.trunc(totalsRow.discounts_total * 100) / 100
    const utilityTotal = Math.trunc(totalsRow.utility_total * 100) / 100
    const moneyTotal = productsTotal + utilityTotal - discountsTotal

    return {
      counts,
      money: {
        productsTotal,
        discountsTotal,
        utilityTotal,
        total: moneyTotal,
      },
      clients,
    }
  }
}
