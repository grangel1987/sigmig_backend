import Sale from '#models/sales/sale'
import { mergeSaleMetadata, normalizeSaleMetadata } from '#services/sales/sale_payload_service'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

interface CreateSalePayload {
  businessId: number
  createdById: number
  title?: string | null
  description?: string | null
  saleDate?: string | null
  status?: 'draft' | 'pending' | 'confirmed' | 'canceled'
  totalAmount?: number | null
  currencyId?: number | null
  metadata?: Record<string, unknown> | null
  banks?: unknown[] | null
  details: Array<{
    productId?: number | null
    lineNumber?: number | null
    description?: string | null
    quantity: number
    unitAmount: number
    amount?: number
    taxes?: unknown[] | null
    utility?: number | null
    metadata?: Record<string, unknown> | null
  }>
}

interface UpdateSalePayload {
  title?: string | null
  description?: string | null
  saleDate?: string | null
  status?: 'draft' | 'pending' | 'confirmed' | 'canceled'
  totalAmount?: number | null
  currencyId?: number | null
  metadata?: Record<string, unknown> | null
  banks?: unknown[] | null
  details?: Array<{
    productId?: number | null
    lineNumber?: number | null
    description?: string | null
    quantity: number
    unitAmount: number
    amount?: number
    taxes?: unknown[] | null
    utility?: number | null
    metadata?: Record<string, unknown> | null
  }>
}

function buildSaleDetailsPayload(details: CreateSalePayload['details']) {
  return details.map((detail, index) => {
    const normalizedAmount =
      detail.amount !== undefined
        ? Number(detail.amount)
        : Number(detail.quantity) * Number(detail.unitAmount)

    const detailMetadata =
      detail.metadata && typeof detail.metadata === 'object' && !Array.isArray(detail.metadata)
        ? { ...detail.metadata }
        : {}

    if (detail.taxes !== undefined) {
      detailMetadata.taxes = Array.isArray(detail.taxes) ? detail.taxes : []
    }

    if (detail.utility !== undefined) {
      detailMetadata.utility = Number(detail.utility) || 0
    }

    return {
      productId: detail.productId ?? null,
      lineNumber: detail.lineNumber ?? index + 1,
      description: detail.description ?? null,
      quantity: Number(detail.quantity),
      unitAmount: Number(detail.unitAmount),
      amount: normalizedAmount,
      metadata: Object.keys(detailMetadata).length ? detailMetadata : null,
    }
  })
}

async function preloadSaleRelations(sale: Sale) {
  await sale.load('business', (q) => q.select(['id', 'name']))
  await sale.load('createdBy', (builder) => {
    builder
      .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
      .select(['id', 'personal_data_id', 'email'])
  })
  await sale.load('currency', (q) => q.select(['id', 'symbol', 'name']))
  await sale.load('details', (q) =>
    q.preload('product', (pq) => pq.select(['id', 'name', 'amount']))
  )
  await sale.load('payments', (q: any) =>
    q.whereNull('deleted_at').orderBy('date', 'desc').preload('coin').preload('ledgerMovement')
  )
}

export default class SaleService {
  public static async create(payload: CreateSalePayload) {
    const trx = await db.transaction()

    try {
      const parsedSaleDate = payload.saleDate ? DateTime.fromISO(payload.saleDate) : null
      const computedTotal = payload.details.reduce((acc, detail) => {
        const lineAmount =
          detail.amount !== undefined
            ? Number(detail.amount)
            : Number(detail.quantity) * Number(detail.unitAmount)
        return acc + lineAmount
      }, 0)

      const sale = await Sale.create(
        {
          businessId: payload.businessId,
          createdById: payload.createdById,
          title: payload.title ?? null,
          description: payload.description ?? null,
          saleDate: parsedSaleDate && parsedSaleDate.isValid ? parsedSaleDate : null,
          status: payload.status ?? 'draft',
          totalAmount: payload.totalAmount ?? computedTotal,
          currencyId: payload.currencyId ?? null,
          metadata: normalizeSaleMetadata(payload),
        },
        { client: trx }
      )

      const detailsPayload = buildSaleDetailsPayload(payload.details)

      await sale.related('details').createMany(detailsPayload, { client: trx })

      await trx.commit()

      await preloadSaleRelations(sale)

      return sale
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  public static async update(saleId: number, payload: UpdateSalePayload, businessId?: number) {
    const trx = await db.transaction()

    try {
      const saleQuery = Sale.query({ client: trx }).where('id', saleId).whereNull('deleted_at')

      if (businessId) {
        saleQuery.where('business_id', businessId)
      }

      const sale = await saleQuery.firstOrFail()
      const parsedSaleDate = payload.saleDate ? DateTime.fromISO(payload.saleDate) : null

      let totalAmount = sale.totalAmount
      if (payload.details) {
        totalAmount = payload.details.reduce((acc, detail) => {
          const lineAmount =
            detail.amount !== undefined
              ? Number(detail.amount)
              : Number(detail.quantity) * Number(detail.unitAmount)
          return acc + lineAmount
        }, 0)
      }
      if (payload.totalAmount !== undefined) {
        totalAmount = payload.totalAmount
      }

      if (payload.title !== undefined) sale.title = payload.title
      if (payload.description !== undefined) sale.description = payload.description
      if (payload.saleDate !== undefined) {
        sale.saleDate = parsedSaleDate && parsedSaleDate.isValid ? parsedSaleDate : null
      }
      if (payload.status !== undefined) sale.status = payload.status
      if (payload.currencyId !== undefined) sale.currencyId = payload.currencyId
      if (totalAmount !== undefined) sale.totalAmount = totalAmount

      if (payload.metadata !== undefined || payload.banks !== undefined) {
        sale.metadata = mergeSaleMetadata(sale.metadata, payload)
      }

      await sale.save()

      if (payload.details) {
        await sale.related('details').query().useTransaction(trx).delete()
        const detailsPayload = buildSaleDetailsPayload(payload.details)
        await sale.related('details').createMany(detailsPayload, { client: trx })
      }

      await trx.commit()

      await preloadSaleRelations(sale)

      return sale
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  public static async updateStatus(
    saleId: number,
    status: 'draft' | 'pending' | 'confirmed' | 'canceled',
    businessId?: number
  ) {
    const saleQuery = Sale.query().where('id', saleId).whereNull('deleted_at')

    if (businessId) {
      saleQuery.where('business_id', businessId)
    }

    const sale = await saleQuery.firstOrFail()

    sale.status = status
    await sale.save()

    return sale
  }

  public static async delete(saleId: number, businessId?: number) {
    const saleQuery = Sale.query().where('id', saleId).whereNull('deleted_at')

    if (businessId) {
      saleQuery.where('business_id', businessId)
    }

    const sale = await saleQuery.firstOrFail()
    sale.deletedAt = DateTime.now()
    await sale.save()
  }
}
