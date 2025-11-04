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
  // Fetch settings by country (legacy-compatible shape)
  public static async findSettingsByCountry(countryId: number): Promise<SettingResponse[]> {
    const settings = await Setting.query()
      .where('country_id', countryId)
      .where('enabled', true)
      .preload('key')
      .preload('createdBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })
      .preload('updatedBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })
      .exec()

    return settings.map((setting) => {
      const keyString = setting.key?.key || ''

      // Build legacy-like payload explicitly to ensure all legacy fields exist
      const createdAt = setting.createdAt
      const updatedAt = setting.updatedAt
      const lastLoginAt = setting.lastLoginAt
      const resetPasswordAt = setting.resetPasswordAt

      const fmt = (d?: any) => (d ? (d as any).toFormat?.('dd/MM/yyyy hh:mm:ss a') ?? null : null)

      const out: SettingResponse = {
        id: setting.id,
        key_id: setting.keyId as number,
        key: keyString,
        value: setting.value,
        country_id: setting.countryId,
        created_by: setting.createdById as number,
        updated_by: setting.updatedById as number,
        enabled: setting.enabled,
        created_at: fmt(createdAt),
        updated_at: fmt(updatedAt),
        last_login_at: fmt(lastLoginAt),
        reset_password_at: resetPasswordAt ? (resetPasswordAt as any).toFormat?.('YYYY-MM-DD HH:mm:ss') ?? null : null,
        createdBy: setting.createdBy
          ? {
            id: setting.createdBy.id,
            full_name: (setting.createdBy as any).full_name || undefined,
            email: setting.createdBy.email,
          }
          : null,
        updatedBy: setting.updatedBy
          ? {
            id: setting.updatedBy.id,
            full_name: (setting.updatedBy as any).full_name || undefined,
            email: setting.updatedBy.email,
          }
          : null,
      }

      return out
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
