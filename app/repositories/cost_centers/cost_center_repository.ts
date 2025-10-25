import db from "@adonisjs/lucid/services/db"

type CostCenterSelectResult = {
  id: number
  text: string
}

export default class CostCenterRepository {

  async select(business_id: number): Promise<CostCenterSelectResult[]> {
    /* const query = `
      SELECT
        cost_centers.id,
        cost_centers.name as text
      FROM
        cost_centers
      WHERE
        cost_centers.enabled = true AND
        cost_centers.business_id = ?
    ` */
    const result = await db.from('cost_centers').
      select(
        'cost_centers.id',
        'cost_centers.name as text'
      ).where('cost_centers.enabled', true).where('business_id', business_id)
      .first()
    return result // MySQL driver returns results in an array
  }
}