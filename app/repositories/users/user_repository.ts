import BusinessUser from "#models/business/business_user"
import Permission from "#models/permissions/permission"
import User from "#models/users/user"
import Menu from "#utils/Menu"
import Util from "#utils/Util"
import db from '@adonisjs/lucid/services/db'
import { DateTime } from "luxon"

interface BusinessItem {
  business_id: number
  business_name: string
  rols: Array<{
    id: number
    name: string
    description: string
    permissions: Array<{ id: number; key: string; description: string; type: string }>
  }>
  permissions: Array<{ id: number; key: string; description: string; type: string }>
  menu: any // Adjust based on Menu.getMenu return type
}

interface UserData {
  id: number
  email: string
  personalData?: {
    id: number
    names: string
    last_name_p: string
    last_name_m: string
    typeIdentify: { id: number; text: string }
    identify: string
  }
  businessUser?: BusinessUser[]
  business?: any[]
}

export default class UserRepository {
  public static async findByEmail(email: string): Promise<User | null> {
    return User.query()
      .select(['id', 'email', 'verified', 'password'])
      .where('email', email)
      .where('enabled', true)
      .first()
  }

  public static async addInfoLocation(dateTime: DateTime, ip: string, userId: number): Promise<void> {
    const tz = await Util.getTimeZone(ip)
    await User.query()
      .where('id', userId)
      .update({
        last_login_at: dateTime.toSQL({ includeOffset: false }),
        last_login_tz: tz || 'America/Santiago',
      })
  }

  public static async findDataCompleteUserByUserId(userId: number) {
    const user = await User.query()
      .select(['id', 'email', 'verified', 'personal_data_id'])
      .where('id', userId)
      .where('enabled', true)
      .preload('personalData', (builder) => {
        builder.select(['id', 'names', 'phone', 'last_name_p', 'last_name_m', 'type_identify_id', 'identify', 'city_id'])
        builder.preload('typeIdentify', (builder) => {
          builder.select(['id', 'text'])
        })
        builder.preload('city')
      })
      .preload('businessUser', (builder) => {
        builder.select(['id', 'user_id', 'business_id'])
        builder.preload('business', (builder) => {
          builder.select(['id', 'name'])
        })
        builder.preload('businessUserRols', (builder) => {
          builder.preload('rols', (rolBuilder) => {
            rolBuilder.select(['id', 'name', 'description'])
            rolBuilder.preload('rolsPermissions', (permBuilder) => {
              permBuilder.preload('permissions', (permBuilder) => {
                permBuilder.select(['id', 'key', 'description', 'type'])
              })
            })
          })
        })
        builder.preload('bussinessUserPermissions', (builder) => {
          builder.preload('permissions', (permBuilder) => {
            permBuilder.select(['id', 'key', 'description', 'type'])
          })
        })
      })
      .firstOrFail()

    const data = user.toJSON() as UserData
    const result: BusinessItem[] = []
    let permissionsGlobal: string[] = []
    let isSuperAdmin = false

    data.businessUser?.forEach((element) => {
      permissionsGlobal = []
      const item: BusinessItem = {
        business_id: element.business.id,
        business_name: element.business.name,
        rols: [],
        permissions: [],
        menu: [],
      }

      element.businessUserRols.forEach((r) => {
        const rol: {
          id: number;
          name: string;
          description: string;
          permissions: Permission[];
        } = {
          id: r.rols.id,
          name: r.rols.name,
          description: r.rols.description,
          permissions: [],
        }

        if (rol.id === 1) {
          isSuperAdmin = true
        } else {
          r.rols.rolsPermissions.forEach((p) => {
            rol.permissions.push(p.permissions)
            permissionsGlobal.push(p.permissions.key)
          })
        }
        item.rols.push(rol)
      })

      element.bussinessUserPermissions.forEach((p) => {
        item.permissions.push(p.permissions)
        permissionsGlobal.push(p.permissions.key)
      })

      item.menu = Menu.getMenu(permissionsGlobal, isSuperAdmin)
      result.push(item)
      isSuperAdmin = false
    })

      // Match legacy behavior: modify data object and return result
      ; (data as any).business = result
    delete (data as any).personal_data_id
    delete (data as any).verified
    delete data.businessUser

    return result
  }

  public static async findById(userId: number): Promise<User | null> {
    return User.query()
      .select(['id', 'email', 'personal_data_id'])
      .where('id', userId)
      .where('enabled', true)
      .first()
  }

  public static async updateToken(token: string, userId: number): Promise<boolean> {
    // Match legacy implementation
    const query = `
      UPDATE tokens
      SET token='${token}'
      WHERE user_id=${userId} AND is_revoked=false
      ORDER BY id DESC LIMIT 1`
    await db.rawQuery(query)
    return true
  }

  public static async revokeOtherTokensOwner(token: string, userId: number): Promise<boolean> {
    // Match legacy implementation
    const query = `
      UPDATE tokens
      SET is_revoked=true
      WHERE user_id=${userId} AND token!='${token}' AND is_revoked=false`
    await db.rawQuery(query)
    return true
  }

  public static async findByArgs(args: string): Promise<any[]> {
    // Match legacy implementation using raw SQL for exact response format
    const query = `
      SELECT
        users.id as user_id,
        users.email,
        personal_data.id as personal_data_id,
        CONCAT(settings.text,' ',personal_data.identify) as identify,
        CONCAT(personal_data.names,' ',personal_data.last_name_p,' ',personal_data.last_name_m) as full_name
      FROM
        users,
        personal_data,
        settings
      WHERE
        settings.id = personal_data.type_identify_id AND
        users.personal_data_id = personal_data.id AND
        users.enabled = true AND
        (
          users.email LIKE '%${args}%' OR
          personal_data.names LIKE '%${args}%' OR
          personal_data.last_name_p LIKE '%${args}%' OR
          personal_data.last_name_m LIKE '%${args}%' OR
          personal_data.identify LIKE '%${args}%'
        )`

    const result = await db.rawQuery(query)
    return result[0] || []
  }
}