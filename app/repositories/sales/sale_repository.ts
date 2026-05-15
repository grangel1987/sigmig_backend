import Sale from '#models/sales/sale'

interface SaleIndexFilters {
  businessId?: number
  page?: number
  perPage?: number
  text?: string
  status?: 'draft' | 'pending' | 'confirmed' | 'canceled'
}

interface SaleOverviewFilters {
  businessId?: number
  status?: 'draft' | 'pending' | 'confirmed' | 'canceled'
  startDate?: string
  endDate?: string
}

export default class SaleRepository {
  public static baseQuery() {
    return Sale.query()
      .whereNull('sales.deleted_at')
      .preload('business', (q) => q.select(['id', 'name', 'url', 'email']))
      .preload('createdBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })
      .preload('currency', (q) => q.select(['id', 'symbol', 'name']))
      .preload('details', (q) => q.preload('product', (pq) => pq.select(['id', 'name', 'amount'])))
      .preload('payments', (q: any) =>
        q.whereNull('deleted_at').orderBy('date', 'desc').preload('coin').preload('ledgerMovement')
      )
      .orderBy('created_at', 'desc')
  }

  public static async index(filters: SaleIndexFilters) {
    const query = this.baseQuery()

    if (filters.businessId) {
      query.where('business_id', filters.businessId)
    }

    if (filters.status) {
      query.where('status', filters.status)
    }

    if (filters.text) {
      query.where((qb) => {
        qb.whereRaw('title LIKE ?', [`%${filters.text}%`]).orWhereRaw('description LIKE ?', [
          `%${filters.text}%`,
        ])
      })
    }

    if (filters.page) {
      return await query.paginate(filters.page, filters.perPage || 10)
    }

    return await query
  }

  public static async findById(id: number, businessId?: number) {
    const query = this.baseQuery().where('sales.id', id)

    if (businessId) {
      query.where('sales.business_id', businessId)
    }

    return await query.first()
  }

  public static async overview(filters: SaleOverviewFilters) {
    const query = Sale.query()
      .whereNull('sales.deleted_at')
      .select(['id', 'sale_date', 'status', 'total_amount', 'utility'])
      .preload('details', (q) =>
        q
          .select(['id', 'sale_id', 'product_id', 'amount', 'taxes', 'utility', 'metadata'])
          .preload('product', (pq) => pq.select(['id', 'name', 'amount']))
      )
      .preload('payments', (q: any) =>
        q
          .whereNull('deleted_at')
          .select(['id', 'sale_id', 'amount', 'voided', 'deleted_at'])
          .orderBy('date', 'desc')
      )

    if (filters.businessId) {
      query.where('sales.business_id', filters.businessId)
    }

    if (filters.status) {
      query.where('sales.status', filters.status)
    }

    if (filters.startDate) {
      query.whereRaw('DATE(COALESCE(sales.sale_date, sales.created_at)) >= ?', [filters.startDate])
    }

    if (filters.endDate) {
      query.whereRaw('DATE(COALESCE(sales.sale_date, sales.created_at)) <= ?', [filters.endDate])
    }

    return await query
  }
}
