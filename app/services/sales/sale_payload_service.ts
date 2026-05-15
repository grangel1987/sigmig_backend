type SaleMetadata = Record<string, unknown>

function asObject(value: unknown): SaleMetadata {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as SaleMetadata) }
    : {}
}

export interface SaleFinancePayload {
  metadata?: Record<string, unknown> | null
  banks?: unknown[] | null
  electronicBilling?: Record<string, unknown> | null
}

type SalePaymentLike = {
  amount?: number | null
  voided?: boolean | null
  deletedAt?: string | null
}

function buildPaymentSummary(totalAmount: unknown, payments: SalePaymentLike[] = []) {
  const activePayments = payments.filter((payment) => !payment?.voided && !payment?.deletedAt)
  const paidAmount = activePayments.reduce(
    (sum, payment) => sum + (Number(payment?.amount) || 0),
    0
  )
  const saleTotal = Number(totalAmount ?? 0) || 0
  const remainingAmount = Math.max(saleTotal - paidAmount, 0)

  return {
    totalAmount: saleTotal,
    paidAmount,
    remainingAmount,
    paymentCount: activePayments.length,
    isPaid: saleTotal > 0 ? remainingAmount === 0 : paidAmount > 0,
  }
}

function sumTaxesFromDetail(detailAmount: number, taxes: unknown[]) {
  return taxes.reduce<number>((sum, taxItem) => {
    if (typeof taxItem === 'number') {
      return sum + taxItem
    }

    if (!taxItem || typeof taxItem !== 'object' || Array.isArray(taxItem)) {
      return sum
    }

    const tax = taxItem as Record<string, unknown>
    const directAmount = Number(tax.amount ?? tax.total)

    if (Number.isFinite(directAmount) && directAmount >= 0) {
      return sum + directAmount
    }

    const rate = Number(tax.rate ?? tax.percentage ?? tax.percent)
    if (Number.isFinite(rate) && rate >= 0) {
      const base = Number(tax.baseAmount ?? detailAmount)
      return sum + (Number.isFinite(base) ? (base * rate) / 100 : 0)
    }

    return sum
  }, 0)
}

function buildFinancialSummary(details: any[] = [], totalAmount: unknown, payments: SalePaymentLike[] = []) {
  const totals = details.reduce(
    (acc, detail) => {
      const detailAmount = Number(detail?.amount) || 0
      const detailTaxes = Array.isArray(detail?.taxes) ? detail.taxes : []
      const detailUtility = Number(detail?.utility) || 0

      acc.subtotal += detailAmount
      acc.taxTotal += sumTaxesFromDetail(detailAmount, detailTaxes)
      acc.utilityTotal += detailUtility

      return acc
    },
    {
      subtotal: 0,
      taxTotal: 0,
      utilityTotal: 0,
    }
  )

  const paymentSummary = buildPaymentSummary(totalAmount, payments)

  return {
    subtotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    utilityTotal: totals.utilityTotal,
    grossTotal: totals.subtotal + totals.taxTotal,
    paymentSummary,
  }
}

export function buildSalesOverview(sales: Array<Record<string, unknown>>) {
  const summary = sales.reduce<{
    salesCount: number
    subtotal: number
    taxTotal: number
    utilityTotal: number
    grossTotal: number
    paidAmount: number
    remainingAmount: number
  }>(
    (acc, sale) => {
      const details = Array.isArray(sale.details) ? (sale.details as any[]) : []
      const payments = Array.isArray(sale.payments) ? (sale.payments as SalePaymentLike[]) : []
      const financial = buildFinancialSummary(details, sale.totalAmount, payments)

      acc.salesCount += 1
      acc.subtotal += financial.subtotal
      acc.taxTotal += financial.taxTotal
      acc.utilityTotal += financial.utilityTotal
      acc.grossTotal += financial.grossTotal
      acc.paidAmount += financial.paymentSummary.paidAmount
      acc.remainingAmount += financial.paymentSummary.remainingAmount

      return acc
    },
    {
      salesCount: 0,
      subtotal: 0,
      taxTotal: 0,
      utilityTotal: 0,
      grossTotal: 0,
      paidAmount: 0,
      remainingAmount: 0,
    }
  )

  return {
    salesCount: summary.salesCount,
    totals: {
      subtotal: summary.subtotal,
      taxes: summary.taxTotal,
      utility: summary.utilityTotal,
      gross: summary.grossTotal,
      payments: {
        paid: summary.paidAmount,
        pending: summary.remainingAmount,
      },
    },
  }
}

export function normalizeSaleMetadata(payload: SaleFinancePayload): SaleMetadata | null {
  const metadata = asObject(payload.metadata)

  if (payload.banks !== undefined) {
    metadata.banks = Array.isArray(payload.banks) ? payload.banks : []
  }

  if (payload.electronicBilling !== undefined) {
    metadata.electronicBilling = payload.electronicBilling
      ? asObject(payload.electronicBilling)
      : null
  }

  return Object.keys(metadata).length > 0 ? metadata : null
}

export function mergeSaleMetadata(
  currentMetadata: Record<string, unknown> | null | undefined,
  payload: SaleFinancePayload
): SaleMetadata | null {
  return normalizeSaleMetadata({
    metadata: asObject(currentMetadata),
    ...payload,
  })
}

export function serializeSale<T extends { metadata?: Record<string, unknown> | null }>(sale: T) {
  const metadata = asObject(sale.metadata)
  const payments = Array.isArray((sale as any).payments)
    ? ((sale as any).payments as SalePaymentLike[])
    : []
  const details = Array.isArray((sale as any).details)
    ? (sale as any).details.map((detail: any) => {
      const detailMetadata = asObject(detail?.metadata)

      return {
        ...detail,
        taxes: Array.isArray(detailMetadata.taxes) ? detailMetadata.taxes : [],
        utility: Number(detailMetadata.utility ?? 0) || 0,
      }
    })
    : (sale as any).details
  const paymentSummary = buildPaymentSummary((sale as any).totalAmount, payments)
  const financialSummary = buildFinancialSummary(
    Array.isArray(details) ? details : [],
    (sale as any).totalAmount,
    payments
  )

  return {
    ...sale,
    details,
    banks: Array.isArray(metadata.banks) ? metadata.banks : [],
    electronicBilling: metadata.electronicBilling ?? null,
    paymentSummary,
    financialSummary,
  }
}

export function serializeSaleCollection<T extends { metadata?: Record<string, unknown> | null }>(
  payload: T | T[] | { data: T[]; meta?: Record<string, unknown> }
) {
  if (Array.isArray(payload)) {
    return payload.map((item) => serializeSale(item))
  }

  if (payload && typeof payload === 'object' && 'data' in payload && Array.isArray(payload.data)) {
    return {
      ...payload,
      data: payload.data.map((item) => serializeSale(item)),
    }
  }

  return serializeSale(payload as T)
}
