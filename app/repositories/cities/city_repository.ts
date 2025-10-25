import db from "@adonisjs/lucid/services/db"

type CitySelectResult = {
  id: number
  text: string
}

export default class CityRepository {

  public static async select(country_id: number): Promise<CitySelectResult[]> {

    const result = await db.from('cities')
      .select('id', 'name as text')
      .where('enabled', 'true')
      .where('country_id', country_id).first()
    return result
  }
}