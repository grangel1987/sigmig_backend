import Indicator from "#models/settings/indicator"
import Setting from "#models/settings/setting"


interface SettingResponse {
  id: number
  key_id: number
  key: string
  value: string
  country_id: number
  created_by: number
  updated_by: number
  enabled: boolean
  created_at: string | null
  updated_at: string | null
  last_login_at: string | null
  reset_password_at: string | null
  createdBy: { id: number; full_name: string; email: string } | null
  updatedBy: { id: number; full_name: string; email: string } | null
}

export default class SettingRepository {
  // Fetch settings by country
  public static async findSettingsByCountry(countryId: number): Promise<SettingResponse[]> {
    const settings = await Setting.query()
      .where('country_id', countryId)
      .where('enabled', true)
      .preload('key')
      .preload('createdBy', (builder) => {
        builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      .preload('updatedBy', (builder) => {
        builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      .exec()



    // Transform response to match v4 format
    return settings.map((setting) => {

      const createdBy = setting.createdBy
      let full_name = createdBy.personalData ?
        `${createdBy.personalData.names} ${createdBy.personalData.lastNameP} ${createdBy.personalData.lastNameM}` :
        'Sin Nombre';
      const serialized = setting.serialize() as SettingResponse
      return {
        ...serialized,
        key: setting.key?.name || '',
        createdBy: setting.createdBy
          ? {
            id: setting.createdBy.id,
            full_name,
            email: setting.createdBy.email,
          }
          : null,
        updatedBy: setting.updatedBy
          ? {
            id: setting.updatedBy.id,
            full_name,
            email: setting.createdBy.email,
          }
          : null,
      }
    })
  }

  // Fetch the latest indicator
  public static async getLastIndicator(): Promise<Indicator | null> {
    return await Indicator.query().orderBy('id', 'desc').first()
  }

  // Alternative: Raw query for getLastIndicator
  /*
  public async getLastIndicator(): Promise<Indicator | null> {
    const result = await Database.rawQuery('SELECT * FROM indicators ORDER BY id DESC LIMIT 1')
    return result[0][0] || null
  }
  */
}
