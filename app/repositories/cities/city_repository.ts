import db from "@adonisjs/lucid/services/db"

type CitySelectResult = {
  id: number
  text: string
}

export default class CityRepository {

  public static async select(country_id: number): Promise<CitySelectResult[]> {

    const q = db.from('cities')
      .select('id', 'name as text')
      .where('enabled', 1)
      .where('country_id', country_id)

    console.log(q.toQuery());

    const result = await q
    return result
  }
}