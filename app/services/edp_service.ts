import BudgetEdp from '#models/budget_edp'
import BudgetPayment from '#models/budget_payment'
import LedgerMovement from '#models/ledger_movement'

export default class EdpService {
  /**
   * Updates the status of an EDP based on its payments
   */
  static async updateStatus(edpId: number, trx?: any): Promise<BudgetEdp> {
    const edp = await BudgetEdp.findOrFail(edpId, { client: trx })
    
    // Sum all non-voided, effective payments for this EDP
    const payments = await BudgetPayment.query({ client: trx })
      .where('budget_edp_id', edpId)
      .where('voided', false)
      .whereNull('deleted_at')

    const paymentIds = payments.map(p => p.id)
    const ledgerMovements = paymentIds.length ? await LedgerMovement.query({ client: trx }).whereIn('budget_payment_id', paymentIds) : []
    const ledgerMap = new Map(ledgerMovements.map(lm => [lm.budgetPaymentId, lm]))

    const totalPaid = payments
      .filter((p) => {
        const lm = ledgerMap.get(p.id)
        return lm && !lm.isProjected
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0)

    let newStatus: 'pending' | 'partial' | 'paid' = 'pending'

    if (totalPaid > 0) {
      if (totalPaid >= edp.amount - 0.01) { // Allowing small floating point variance
        newStatus = 'paid'
      } else {
        newStatus = 'partial'
      }
    }

    if (edp.status !== newStatus) {
      edp.status = newStatus
      await edp.useTransaction(trx ?? null).save()
    }

    return edp
  }
}
