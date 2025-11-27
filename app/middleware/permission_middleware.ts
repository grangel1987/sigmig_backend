import BusinessUser from '#models/business/business_user'
import Module from '#models/module'
import Permission from '#models/permissions/permission'
import User from '#models/users/user'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Permission middleware validates user access based on:
 * A) User has isAdmin flag
 * B) User has isSuper flag in selected business user
 * C) User has the corresponding permission
 */
export default class PermissionMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user as User

    // A) Check if user is admin
    if (user?.isAdmin) {
      return next()
    }

    // B) Check if user is super user in their selected business
    const selectedBusiness = await user?.related('selectedBusiness').query().first()
    if (selectedBusiness?.isSuper) {
      return next()
    }

    // C) Check if user has the required permission
    const requiredPermission = this.getRequiredPermission(ctx)
    if (requiredPermission) {
      const hasPermission = await this.checkUserPermission(selectedBusiness, requiredPermission)
      if (hasPermission) {
        return next()
      }
    }

    // If none of the conditions are met, deny access
    return ctx.response.forbidden({
      message: 'No tienes permisos para realizar esta acción',
      code: 'INSUFFICIENT_PERMISSIONS'
    })
  }

  /**
   * Determine the required permission based on the route
   */
  private getRequiredPermission(ctx: HttpContext): string | null {
    const route = ctx.route
    const method = ctx.request.method()
    const pattern = route?.pattern || ''

    // Extract controller and action from route pattern
    // Pattern format: #controllers/controller/action
    const controllerMatch = pattern.match(/#controllers\/([^\/]+)\/([^\/]+)/)
    if (!controllerMatch) return null

    const controller = controllerMatch[1] // e.g., "cities", "countries", "works"
    const action = controllerMatch[2]     // e.g., "index", "store", "update"

    // Map controller to module key
    const moduleKey = this.mapControllerToModule(controller)
    if (!moduleKey) return null

    // Map action to permission key
    const permissionKey = this.mapActionToPermission(action, method)
    if (!permissionKey) return null

    return `${moduleKey}.${permissionKey}`
  }

  /**
   * Map controller name to module key
   */
  private mapControllerToModule(controller: string): string | null {
    const controllerToModuleMap: Record<string, string> = {
      // Core modules
      'cities': 'cities',
      'countries': 'countries',
      'works': 'works',
      'cost_centers': 'cost_centers',
      'positions': 'positions',
      'business': 'business',
      'users': 'users',
      'employees': 'employees',
      'clients': 'clients',
      'client_requests': 'client_requests',
      'bugets': 'bugets',
      'shopping': 'shopping',
      'booking': 'booking',
      'products': 'products',
      'providers': 'providers',
      'banks': 'banks',
      'coins': 'coins',

      // Settings modules
      'setting_booking_item': 'settings',
      'setting_booking_property': 'settings',
      'setting_buget_category': 'settings',
      'setting_buget_item': 'settings',
      'setting_booking_note': 'settings',
      'isapres': 'settings',
      'discount': 'settings',
      'asset': 'settings',
      'afp': 'settings',
      'type_contract': 'settings',
      'affiliation': 'settings',
      'load_family': 'settings',
      'layoff': 'settings',
      'exregime': 'settings',
      'certificate_health_item': 'settings',
      'legal_gratifications': 'settings',
      'schedules': 'settings',
      'setting_lic': 'settings'
    }

    return controllerToModuleMap[controller] || null
  }

  /**
   * Map HTTP method and action to permission key
   */
  private mapActionToPermission(action: string, method: string): string | null {
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
          case 'GET': return 'view'
          case 'POST': return 'create'
          case 'PUT': return 'update'
          case 'DELETE': return 'delete'
          default: return null
        }
    }
  }

  /**
   * Check if user has the required permission
   */
  private async checkUserPermission(selectedBusiness: BusinessUser | null, requiredPermission: string): Promise<boolean> {
    if (!selectedBusiness) return false

    // Split permission into module and action
    const [moduleKey, permissionKey] = requiredPermission.split('.')

    // Find the module
    const module = await Module.query().where('key', moduleKey).first()
    if (!module) return false

    // Find the permission
    const permission = await Permission.query()
      .where('moduleId', module.id)
      .where('key', permissionKey)
      .first()

    if (!permission) return false

    // Check if user has this permission through business user permissions
    const businessUserPermission = await selectedBusiness
      .related('bussinessUserPermissions')
      .query()
      .where('permissionId', permission.id)
      .first()

    return !!businessUserPermission
  }
}