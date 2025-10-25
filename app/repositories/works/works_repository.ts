import db from "@adonisjs/lucid/services/db"

type WorkSelectResult = {
  id: number
  text: string
}

export default class WorksRepository {

  static async select(business_id: number): Promise<WorkSelectResult[]> {
    const query = `
      SELECT
        works.id,
        works.name as text
      FROM
        works
      WHERE
        works.enabled = true AND
        works.business_id = ?
    `
    const result = await db.rawQuery(query, [business_id])
    return result[0] // MySQL driver returns results in an array
  }
}