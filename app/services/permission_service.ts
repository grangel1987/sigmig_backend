import BusinessUser from '#models/business/business_user'
import Module from '#models/module'
import Permission from '#models/permissions/permission'
import User from '#models/users/user'
import { HttpContext } from '@adonisjs/core/http'

/**
 * Permission service for validating user access
 */
export default class PermissionService {
  /**
   * Check if user can perform an action based on:
   * A) User has isAdmin flag
   * B) User has isSuper flag in selected business user
   * C) User has the corresponding permission
   */
  static async canPerformAction(
    ctx: HttpContext,
    moduleKey: string,
    permissionKey: string
  ): Promise<boolean> {
    const user = ctx.auth.user as User

    if (!user) return true

    // A) Check if user is admin
    if (user?.isAdmin) {
      return true
    }

    // B) Check if user is super user in their selected business
    const selectedBusiness = await user?.related('selectedBusiness').query().first()
    if (selectedBusiness?.isSuper) {
      console.log('User is super user in selected business')
      return true
    }

    // C) Check if user has the required permission
    console.log(`Checking permission for module: ${moduleKey}, permission: ${permissionKey}`)
    return await this.checkUserPermission(selectedBusiness, moduleKey, permissionKey)
  }

  /**
   * Check if user has the required permission
   */
  private static async checkUserPermission(
    selectedBusiness: BusinessUser | null,
    moduleKey: string,
    permissionKey: string
  ): Promise<boolean> {
    if (!selectedBusiness) return false

    const module = await Module.query().where('key', moduleKey).first()
    if (!module) return false

    // Find the permission
    const permission = await Permission.query()
      .where('moduleId', module.id)
      .where('key', permissionKey)
      .first()

    if (!permission) return false

    console.log({ permissionId: permission.id, moduleId: module.id })

    // Check if user has this permission through business user permissions
    const businessUserPermission = await selectedBusiness
      .related('roles')
      .query()
      .whereHas('permissions', (pQ) => pQ.where('permissions.id', permission.id))
      .first()

    return !!businessUserPermission
  }

  /**
   * Throw forbidden error if user cannot perform action
   */
  static async requirePermission(
    ctx: HttpContext,
    moduleKey: string,
    permissionKey: string
  ): Promise<void> {

    // return

    const hasPermission = await this.canPerformAction(ctx, moduleKey, permissionKey)

    if (!hasPermission) {
      ctx.response.unauthorized({
        message: ctx.i18n.formatMessage('messages.no_permission'),
        code: 'INSUFFICIENT_PERMISSIONS',
      })
      return
    }
  }

  /**
   * Map controller name to module key
   */
  static mapControllerToModule(controller: string): string | null {
    const controllerToModuleMap: Record<string, string> = {
      // Core modules
      cities: 'cities',
      countries: 'countries',
      works: 'works',
      cost_centers: 'cost_centers',
      positions: 'positions',
      business: 'business',
      users: 'users',
      employees: 'employees',
      clients: 'clients',
      client_requests: 'client_requests',
      bugets: 'bugets',
      shopping: 'shopping',
      booking: 'booking',
      products: 'products',
      providers: 'providers',
      banks: 'banks',
      coins: 'coins',

      // Settings modules
      setting_booking_item: 'settings',
      setting_booking_property: 'settings',
      setting_buget_category: 'settings',
      setting_buget_item: 'settings',
      setting_booking_note: 'settings',
      isapres: 'settings',
      discount: 'settings',
      asset: 'settings',
      afp: 'settings',
      type_contract: 'settings',
      affiliation: 'settings',
      load_family: 'settings',
      layoff: 'settings',
      exregime: 'settings',
      certificate_health_item: 'settings',
      legal_gratifications: 'settings',
      schedules: 'settings',
      setting_lic: 'settings',
    }

    return controllerToModuleMap[controller] || null
  }

  /**
   * Map HTTP method and action to permission key
   */
  static mapActionToPermission(action: string, method: string): string | null {
    // Handle different action patterns
    switch (action) {
      case 'index':
      case 'findAll':
      case 'findByArgs':
      case 'select':
      case 'findByCountry':
      case 'findByType':
        return method === 'GET' ? 'view' : null

      case 'store':
      case 'create':
        return method === 'POST' ? 'create' : null

      case 'show':
      case 'findByToken':
        return method === 'GET' ? 'view' : null

      case 'update':
        return method === 'PUT' ? 'update' : null

      case 'changeStatus':
      case 'changeBusiness':
      case 'toggleUserStatus':
        return method === 'PUT' ? 'update' : null

      case 'delete':
        return method === 'DELETE' ? 'delete' : null

      case 'findModules':
      case 'findPermission':
        return method === 'GET' ? 'view' : null

      // Special cases
      case 'login':
      case 'webClientLogin':
      case 'forgotPassword':
      case 'changePasswordForgot':
      case 'resetPassword':
      case 'changePasswordOwner':
      case 'recoverPassword':
      case 'findSuperusers':
        return null // Public/auth endpoints

      default:
        // For unknown actions, try to infer from method
        switch (method) {
          case 'GET':
            return 'view'
          case 'POST':
            return 'create'
          case 'PUT':
            return 'update'
          case 'DELETE':
            return 'delete'
          default:
            return null
        }
    }
  }
}
