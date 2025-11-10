import db from "@adonisjs/lucid/services/db"

type CostCenterSelectResult = {
  id: number
  name: string
  code: string
}

export default new class CostCenterRepository {

  async select(business_id: number): Promise<CostCenterSelectResult[]> {

    const result = await db.from('cost_centers').
      select(
        'cost_centers.id',
        'cost_centers.name',
        'cost_centers.code'
      ).where('cost_centers.enabled', true)
      .where('business_id', business_id)

    return result  // MySQL driver returns results in an array
  }
}