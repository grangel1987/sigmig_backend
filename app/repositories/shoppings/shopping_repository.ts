import Shopping from '#models/shoppings/shopping'
import Database from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class ShoppingRepository {
  static async findByNameProvider(businessId: number, name: string) {
    const sql = `
      SELECT 
        shoppings.id,
        shoppings.nro,
        providers.name AS provider_name,
        providers.email,
        cities.name AS city,
        shoppings.created_at,
        shoppings.expire_date,
        shoppings.enabled,
        shoppings.is_authorized
      FROM 
        shoppings,
        providers,
        cities
      WHERE
        shoppings.business_id= ? AND
        providers.name LIKE ? AND
        providers.id = shoppings.provider_id AND
        providers.city_id = cities.id
    `
    const result = await Database.rawQuery(sql, [businessId, `%${name}%`])
    return result[0]
  }

  static async findByDate(businessId: number, date: string) {
    const sql = `
      SELECT 
        shoppings.id,
        shoppings.nro,
        providers.name AS provider_name,
        providers.email,
        cities.name AS city,
        shoppings.created_at,
        shoppings.expire_date,
        shoppings.enabled,
        shoppings.is_authorized
      FROM 
        shoppings,
        providers,
        cities
      WHERE
        shoppings.business_id=? AND
        DATE(shoppings.created_at) = ? AND
        providers.id = shoppings.provider_id AND
        providers.city_id = cities.id
    `
    const result = await Database.rawQuery(sql, [businessId, date])
    return result[0]
  }

  public static async report(businessId: number, dateInitial?: Date, dateEnd?: Date, page?: number, limit?: number) {
    const start = dateInitial ? DateTime.fromJSDate(dateInitial).toSQLDate()! : '1970-01-01'
    const end = dateEnd ? DateTime.fromJSDate(dateEnd).toSQLDate()! : '9999-12-31'

    const q = Shopping.query()
      .where('business_id', businessId)
      .whereRaw('DATE(created_at) BETWEEN ? AND ?', [start, end])
      .preload('provider', (p) => p.select(['id', 'name']))
      .preload('costCenter', (cc) => cc.select(['id', 'code', 'name']))
      .preload('authorizer', (a) => {
        a.select(['id', 'personal_data_id', 'email'])
        a.preload('personalData', (pd) => pd.select(['names', 'last_name_p', 'last_name_m']))
      })
      .select(['id', 'nro', 'provider_id', 'cost_center_id', 'authorizer_id', 'created_at', 'expire_date', 'enabled', 'is_authorized'])
      .orderBy('created_at', 'desc')

    if (page && limit) {
      return await q.paginate(page, limit)
    }

    return await q
  }

  public static async metricsByCostCenter(
    businessId: number,
    dateInitial?: Date,
    dateEnd?: Date
  ): Promise<{
    totals: {
      count: number
      productsTotal: number
      sendTotal: number
      otherTotal: number
      total: number
    }
    byCostCenter: Array<{
      costCenterId: number | null
      code: string | null
      name: string | null
      count: number
      productsTotal: number
      sendTotal: number
      otherTotal: number
      total: number
    }>
  }> {
    const start = dateInitial ? DateTime.fromJSDate(dateInitial).toSQLDate()! : '1970-01-01'
    const end = dateEnd ? DateTime.fromJSDate(dateEnd).toSQLDate()! : '9999-12-31'
    // Overall totals (products sum and other amounts)
    const totalsRow = (await Database.from('shoppings')
      .leftJoin('shopping_products as sp', 'sp.shopping_id', 'shoppings.id')
      .where('shoppings.business_id', businessId)
      .whereRaw('DATE(shoppings.created_at) BETWEEN ? AND ?', [start, end])
      .select(
        Database.raw('IFNULL(SUM(sp.price * sp.count), 0) AS products_total'),
        Database.raw('IFNULL(SUM(shoppings.send_amount), 0) AS send_total'),
        Database.raw('IFNULL(SUM(shoppings.other_amount), 0) AS other_total')
      )
      .first()) as { products_total: number; send_total: number; other_total: number } | undefined

    const totalsSafe = totalsRow ?? { products_total: 0, send_total: 0, other_total: 0 }

    const overallCountRow = (await Database.from('shoppings')
      .where('business_id', businessId)
      .whereRaw('DATE(created_at) BETWEEN ? AND ?', [start, end])
      .count('* as cnt')
      .first()) as { cnt: number } | undefined

    const overallCount = Number(overallCountRow?.cnt ?? 0)

    const productsTotal = Math.trunc(totalsSafe.products_total * 100) / 100
    const sendTotal = Math.trunc(totalsSafe.send_total * 100) / 100
    const otherTotal = Math.trunc(totalsSafe.other_total * 100) / 100
    const overallMoneyTotal = productsTotal + sendTotal + otherTotal

    // Aggregation grouped by cost center
    const rowsByCostCenter = (await Database.from('shoppings')
      .leftJoin('shopping_products as sp', 'sp.shopping_id', 'shoppings.id')
      .leftJoin('cost_centers as cc', 'cc.id', 'shoppings.cost_center_id')
      .where('shoppings.business_id', businessId)
      .whereRaw('DATE(shoppings.created_at) BETWEEN ? AND ?', [start, end])
      .select(
        'shoppings.cost_center_id as costCenterId',
        'cc.code as costCenterCode',
        'cc.name as costCenterName',
        Database.raw('COUNT(DISTINCT shoppings.id) as cnt'),
        Database.raw('IFNULL(SUM(sp.price * sp.count), 0) as products_total'),
        Database.raw('IFNULL(SUM(shoppings.send_amount), 0) as send_total'),
        Database.raw('IFNULL(SUM(shoppings.other_amount), 0) as other_total')
      )
      .groupBy('shoppings.cost_center_id', 'cc.code', 'cc.name')
      .orderByRaw('cnt desc')) as Array<{
        costCenterId: number | null
        costCenterCode: string | null
        costCenterName: string | null
        cnt: number
        products_total: number
        send_total: number
        other_total: number
      }>

    const byCostCenter = rowsByCostCenter.map((r) => {
      const pTotal = Math.trunc((r.products_total ?? 0) * 100) / 100
      const sTotal = Math.trunc((r.send_total ?? 0) * 100) / 100
      const oTotal = Math.trunc((r.other_total ?? 0) * 100) / 100
      return {
        costCenterId: r.costCenterId,
        code: r.costCenterCode,
        name: r.costCenterName,
        count: Number(r.cnt ?? 0),
        productsTotal: pTotal,
        sendTotal: sTotal,
        otherTotal: oTotal,
        total: pTotal + sTotal + oTotal,
      }
    })

    return {
      totals: {
        count: overallCount,
        productsTotal,
        sendTotal,
        otherTotal,
        total: overallMoneyTotal,
      },
      byCostCenter,
    }
  }
}
