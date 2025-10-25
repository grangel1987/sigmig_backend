import db from "@adonisjs/lucid/services/db"

type CountrySelectResult = {
  id: number
  text: string
  nat: string
  prefix: string
}

export default class CountryRepository {

  static async select(): Promise<CountrySelectResult[]> {
    const query = `
      SELECT
        countries.id,
        countries.name as text,
        countries.nationality as nat,
        countries.phone_code as prefix
      FROM
        countries
      WHERE
        countries.enabled = true
    `
    const result = await db.from('countries').select(
      'countries.id',
      'countries.name as text',
      'countries.nationality as nat',
      'countries.phone_code as prefix'
    ).where('enabled', true).first()

    return result // MySQL driver returns results in an array
  }
}