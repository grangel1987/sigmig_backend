type SaleMetadata = Record<string, unknown>

function asObject(value: unknown): SaleMetadata {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as SaleMetadata) }
    : {}
}

export interface SaleFinancePayload {
  metadata?: Record<string, unknown> | null
  banks?: unknown[] | null
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

export function normalizeSaleMetadata(payload: SaleFinancePayload): SaleMetadata | null {
  const metadata = asObject(payload.metadata)

  if (payload.banks !== undefined) {
    metadata.banks = Array.isArray(payload.banks) ? payload.banks : []
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

  return {
    ...sale,
    details,
    banks: Array.isArray(metadata.banks) ? metadata.banks : [],
    paymentSummary: buildPaymentSummary((sale as any).totalAmount, payments),
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
