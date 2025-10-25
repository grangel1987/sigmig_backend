import BusinessDelegate from "#models/business/business_delegate"
import db from "@adonisjs/lucid/services/db"

interface BusinessByUser {
  id: number
  name: string
  url: string
  url_thumb: string
  type_identify_id: number
  is_utility: boolean
  utility: number
  is_discount: boolean
  discount: number
  phone: string
  authorization_minor: boolean
  type_identify: string
  identify: string
  selected: boolean
  rol: string
  email_confirm_inactive_employee: boolean
  enabled: boolean
  country_id: number
  country: string
  phone_code: string
  city_id: number
  city: string
  coins?: BusinessCoin[]
  taxes?: BusinessTax[]
  delegate?: BusinessDelegate
}

interface BusinessOneById {
  id: number
  name: string
  url: string
  url_thumb: string
  type_identify_id: number
  type_identify: string
  identify: string
  enabled: boolean
  phone: string
  email: string
  address: string
  days_expire_buget: number
  authorization_minor: boolean
  country_id: number
  country: string
  phone_code: string
  coins?: BusinessCoin[]
  taxes?: BusinessTax[]
  delegate?: BusinessDelegate
}

interface BusinessCoin {
  business_id: number
  is_default: boolean
  coin_id: number
  name: string
  symbol: string
}

interface BusinessTax {
  tax: number
  business_id: number
}

export default class BusinessRepository {
  public static async findBusinessByUser(userId: number): Promise<BusinessByUser[]> {
    const result = await db
      .from('businesses')
      .select(
        'businesses.id',
        'businesses.name',
        'businesses.url',
        'businesses.url_thumb',
        'businesses.type_identify_id',
        'businesses.is_utility',
        'businesses.utility',
        'businesses.is_discount',
        'businesses.discount',
        'businesses.phone',
        'businesses.authorization_minor',
        'settings.text as type_identify',
        'businesses.identify',
        'business_users.selected',
        'business_users.rol',
        'businesses.email_confirm_inactive_employee',
        'businesses.enabled',
        'countries.id as country_id',
        'countries.name as country',
        'countries.phone_code',
        'cities.id as city_id',
        'cities.name as city'
      )
      .innerJoin('business_users', 'businesses.id', 'business_users.business_id')
      .innerJoin('countries', 'countries.id', 'businesses.country_id')
      .innerJoin('settings', 'settings.id', 'businesses.type_identify_id')
      .innerJoin('cities', 'businesses.city_id', 'cities.id')
      .where('businesses.enabled', true)
      .where('business_users.user_id', userId).first()

    return result
  }

  public static async findBusinessOneById(businessId: number): Promise<BusinessOneById | null> {
    const query = `
    SELECT 
        businesses.id,
        businesses.name,
        businesses.url,
        businesses.url_thumb,
        businesses.type_identify_id,
        settings.text as type_identify,
        businesses.identify,
        businesses.enabled,
        businesses.phone,
        businesses.email,
        businesses.address,
        businesses.days_expire_buget,
        businesses.authorization_minor,
        countries.id AS country_id,
        countries.name AS country,
        countries.phone_code
      FROM
        settings,
        businesses,
        countries
      WHERE
        businesses.enabled=TRUE AND        
        businesses.id=${businessId} AND
        countries.id = businesses.country_id AND
        settings.id = businesses.type_identify_id
    `

    const result = await db.rawQuery(query)
    return result[0][0] || null
  }

  public static async findBusinessCoins(userId: number): Promise<BusinessCoin[]> {
    const query = `
    SELECT 
      businesses.id AS business_id,
      business_coins.is_default,
      coins.id AS coin_id,
      coins.name,
      coins.symbol
    FROM
      businesses,
      business_coins,
      coins,
      business_users
    WHERE
      businesses.id= business_coins.business_id AND
      coins.id = business_coins.coin_id AND
      business_users.business_id =businesses.id AND
      business_users.user_id=${userId}
    `

    const result = await db.rawQuery(query)
    return result[0]
  }

  public static async findBusinessOneCoins(businessId: number): Promise<BusinessCoin[]> {
    const query = `
    SELECT 
      businesses.id AS business_id,
      business_coins.is_default,
      coins.id AS coin_id,
      coins.name,
      coins.symbol
    FROM
      businesses,
      business_coins,
      coins
    WHERE
      businesses.id= business_coins.business_id AND
      coins.id = business_coins.coin_id AND      
      businesses.id=${businessId}
    `

    const result = await db.rawQuery(query)
    return result[0]
  }

  public static async findBusinessDelegate(businessId: number): Promise<BusinessDelegate | null> {
    const result = await db.from('business_delegates').where('business_id', businessId).first()
    return result || null
  }

  public static async findBusinessTaxes(userId: number): Promise<BusinessTax[]> {
    const query = `
    SELECT
      country_taxes.tax,
      businesses.id AS business_id
    FROM
      country_taxes,
      countries,
      businesses,
      business_users
    WHERE
      country_taxes.country_id = countries.id AND
      businesses.country_id = countries.id AND	
      businesses.id= business_users.business_id AND
      business_users.user_id=${userId}
    ORDER BY tax asc`

    const result = await db.rawQuery(query)
    return result[0]
  }
}