import LedgerMovement from '#models/ledger_movement'
import PaymentDocumentType from '#models/payment_document_type'
import SalePayment from '#models/sale_payment'
import Sale from '#models/sales/sale'
import handleDate from '#utils/HandleDate'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

interface SalePaymentParams {
  saleId?: number
  businessId?: number
  accountId?: number
  costCenterId?: number
  clientId?: number
  date?: string | Date | DateTime
  dueDate?: string | Date | DateTime | null
  amount?: number
  currencyId?: number
  paymentMethodId?: number
  documentTypeId?: number
  documentNumber?: string | null
  concept?: string | null
  status?: 'paid' | 'pending' | 'voided'
  isProjected?: boolean
  receivedAt?: string | Date | DateTime | null
  invoiced?: boolean
  invoiceMeta?: Record<string, unknown> | null
  deletedBy?: number | null
}

function normalizeDate(value?: string | Date | DateTime | null) {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  return handleDate(value)
}

async function validatePaymentAmount(saleId: number, amount: number, excludePaymentId?: number) {
  const sale = await Sale.findOrFail(saleId)
  const saleTotal = Number(sale.totalAmount ?? 0)

  if (saleTotal <= 0) {
    return sale
  }

  const paymentsQuery = SalePayment.query()
    .where('sale_id', saleId)
    .whereNull('deleted_at')
    .where('voided', false)

  if (excludePaymentId) {
    paymentsQuery.whereNot('id', excludePaymentId)
  }

  const payments = await paymentsQuery
  const paidAmount = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)

  if (paidAmount + Number(amount) > saleTotal) {
    throw new Error('Sale payment amount exceeds remaining total')
  }

  return sale
}

async function preloadSalePayment(payment: SalePayment) {
  await payment.load('sale', (q) => q.select(['id', 'title', 'total_amount', 'business_id']))
  await payment.load('coin', (q) => q.select(['id', 'symbol', 'name']))
  await payment.load('ledgerMovement', (q) => {
    q.preload('account')
    q.preload('costCenter')
    q.preload('client')
    q.preload('currency')
    q.preload('paymentMethod')
    q.preload('documentType')
  })
}

export default class SalePaymentService {
  static async create(params: SalePaymentParams) {
    if (!params.saleId || !params.amount || !params.currencyId || !params.date) {
      throw new Error('Missing required sale payment fields')
    }

    const sale = await validatePaymentAmount(params.saleId, params.amount)
    const trx = await db.transaction()

    try {
      const payment = await SalePayment.create(
        {
          saleId: params.saleId,
          coinId: params.currencyId,
          amount: params.amount,
          invoiced: params.invoiced ?? false,
          invoiceMeta: params.invoiceMeta ?? null,
          date: handleDate(params.date),
          dueDate: normalizeDate(params.dueDate) ?? null,
          voided: false,
          voidedAt: null,
          deletedAt: null,
          deletedBy: null,
        },
        { client: trx }
      )

      const documentType = params.documentTypeId
        ? await PaymentDocumentType.query({ client: trx })
            .where('id', params.documentTypeId)
            .first()
        : null

      const hasDocumentNumber = Boolean(params.documentNumber?.trim())
      const isProjected = hasDocumentNumber
        ? false
        : (params.isProjected ?? documentType?.isProjected ?? false)
      const status =
        hasDocumentNumber && params.status !== 'voided' ? 'paid' : (params.status ?? 'pending')
      const receivedAt = params.receivedAt
        ? handleDate(params.receivedAt)
        : status === 'paid'
          ? DateTime.now()
          : null

      const ledgerMovement = await LedgerMovement.create(
        {
          businessId: params.businessId ?? sale.businessId,
          salePaymentId: payment.id,
          accountId: params.accountId,
          costCenterId: params.costCenterId,
          clientId: params.clientId,
          date: handleDate(params.date),
          amount: params.amount,
          currencyId: params.currencyId,
          paymentMethodId: params.paymentMethodId,
          documentTypeId: params.documentTypeId,
          documentNumber: params.documentNumber ?? null,
          concept: params.concept ?? sale.title ?? null,
          status,
          isProjected,
          receivedAt,
        },
        { client: trx }
      )

      await trx.commit()

      await preloadSalePayment(payment)

      return {
        salePayment: payment,
        ledgerMovement,
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  static async update(salePaymentId: number, params: SalePaymentParams) {
    let trx: any

    try {
      const existingPayment = await SalePayment.findOrFail(salePaymentId)

      if (params.amount !== undefined && params.amount !== existingPayment.amount) {
        await validatePaymentAmount(existingPayment.saleId, params.amount, salePaymentId)
      }

      trx = await db.transaction()

      const payment = await SalePayment.findOrFail(salePaymentId, { client: trx })

      if (params.saleId !== undefined) payment.saleId = params.saleId
      if (params.currencyId !== undefined) payment.coinId = params.currencyId
      if (params.amount !== undefined) payment.amount = params.amount
      if (params.invoiced !== undefined) payment.invoiced = params.invoiced
      if (params.invoiceMeta !== undefined) payment.invoiceMeta = params.invoiceMeta
      if (params.date !== undefined) payment.date = handleDate(params.date)
      if (params.dueDate !== undefined) payment.dueDate = normalizeDate(params.dueDate) ?? null
      await payment.save()

      const ledgerMovement = await LedgerMovement.query({ client: trx })
        .where('sale_payment_id', salePaymentId)
        .firstOrFail()

      if (params.accountId !== undefined) ledgerMovement.accountId = params.accountId
      if (params.costCenterId !== undefined) ledgerMovement.costCenterId = params.costCenterId
      if (params.clientId !== undefined) ledgerMovement.clientId = params.clientId
      if (params.date !== undefined) ledgerMovement.date = handleDate(params.date)
      if (params.amount !== undefined) ledgerMovement.amount = params.amount
      if (params.currencyId !== undefined) ledgerMovement.currencyId = params.currencyId
      if (params.paymentMethodId !== undefined)
        ledgerMovement.paymentMethodId = params.paymentMethodId
      let updatedDocumentType: PaymentDocumentType | null = null
      if (params.documentTypeId !== undefined) {
        ledgerMovement.documentTypeId = params.documentTypeId
        updatedDocumentType = await PaymentDocumentType.query({ client: trx })
          .where('id', params.documentTypeId)
          .first()
      }
      if (params.documentNumber !== undefined)
        ledgerMovement.documentNumber = params.documentNumber ?? null
      if (params.concept !== undefined) ledgerMovement.concept = params.concept ?? null
      if (params.status !== undefined) ledgerMovement.status = params.status
      if (params.isProjected !== undefined) ledgerMovement.isProjected = params.isProjected
      if (params.receivedAt !== undefined) {
        ledgerMovement.receivedAt = normalizeDate(params.receivedAt) ?? null
      }

      const docNumberNow = params.documentNumber?.trim()
      const markReceived = Boolean(docNumberNow) && params.status !== 'voided'
      if (markReceived) {
        if (!ledgerMovement.receivedAt) ledgerMovement.receivedAt = DateTime.now()
        if (params.status === undefined) ledgerMovement.status = 'paid'
        ledgerMovement.isProjected = false
      } else if (params.documentTypeId !== undefined && params.isProjected === undefined) {
        ledgerMovement.isProjected = updatedDocumentType?.isProjected ?? ledgerMovement.isProjected
      }

      await ledgerMovement.save()
      await trx.commit()

      await preloadSalePayment(payment)

      return {
        salePayment: payment,
        ledgerMovement,
      }
    } catch (error) {
      if (trx) await trx.rollback()
      throw error
    }
  }

  static async delete(salePaymentId: number, deletedBy?: number | null) {
    const trx = await db.transaction()

    try {
      await LedgerMovement.query({ client: trx }).where('sale_payment_id', salePaymentId).delete()

      const payment = await SalePayment.findOrFail(salePaymentId, { client: trx })
      payment.deletedAt = DateTime.now()
      payment.deletedBy = deletedBy ?? null
      await payment.save()

      await trx.commit()
      return { success: true }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  static async findWithLedgerMovement(salePaymentId: number) {
    const salePayment = await SalePayment.query()
      .where('id', salePaymentId)
      .whereNull('deleted_at')
      .preload('sale', (q) => q.select(['id', 'title', 'total_amount', 'business_id']))
      .preload('coin', (q) => q.select(['id', 'symbol', 'name']))
      .firstOrFail()

    const ledgerMovement = await LedgerMovement.query()
      .where('sale_payment_id', salePaymentId)
      .preload('account')
      .preload('costCenter')
      .preload('client')
      .preload('currency')
      .preload('paymentMethod')
      .preload('documentType')
      .first()

    return {
      salePayment,
      ledgerMovement,
    }
  }

  static async void(salePaymentId: number) {
    const trx = await db.transaction()

    try {
      const payment = await SalePayment.findOrFail(salePaymentId, { client: trx })
      payment.voided = true
      payment.voidedAt = DateTime.now()
      await payment.save()

      const ledgerMovement = await LedgerMovement.query({ client: trx })
        .where('sale_payment_id', salePaymentId)
        .first()

      if (ledgerMovement) {
        ledgerMovement.status = 'voided'
        await ledgerMovement.save()
      }

      await trx.commit()

      await preloadSalePayment(payment)

      return {
        salePayment: payment,
        ledgerMovement,
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  static async settle(salePaymentId: number, documentNumber: string, documentTypeId?: number) {
    const trx = await db.transaction()

    try {
      const payment = await SalePayment.findOrFail(salePaymentId, { client: trx })
      const ledgerMovement = await LedgerMovement.query({ client: trx })
        .where('sale_payment_id', salePaymentId)
        .firstOrFail()

      ledgerMovement.documentNumber = documentNumber
      if (documentTypeId !== undefined) {
        ledgerMovement.documentTypeId = documentTypeId
      }
      ledgerMovement.isProjected = false
      ledgerMovement.status = 'paid'
      ledgerMovement.receivedAt = DateTime.now()
      await ledgerMovement.useTransaction(trx).save()

      await trx.commit()

      await preloadSalePayment(payment)

      return {
        salePayment: payment,
        ledgerMovement,
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
