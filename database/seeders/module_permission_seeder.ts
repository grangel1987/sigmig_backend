import Module from '#models/module'
import Permission from '#models/permissions/permission'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSeeder {
  async run() {

    const trx = await db.transaction()
    // Create modules
    try {
      const modules = [
        { id: 1, key: 'users', name: 'Usuarios', description: 'Gestión de Usuarios' },
        { id: 2, key: 'business', name: 'Empresas', description: 'Gestión de Empresas' },
        { id: 3, key: 'employees', name: 'Empleados', description: 'Gestión de Empleados' },
        { id: 4, key: 'clients', name: 'Clientes', description: 'Gestión de Clientes' },
        { id: 5, key: 'client_requests', name: 'Solicitudes de Clientes', description: 'Solicitudes de Clientes' },
        { id: 6, key: 'bugets', name: 'Presupuestos', description: 'Presupuestos/Cotizaciones' },
        { id: 7, key: 'shopping', name: 'Compras', description: 'Órdenes de Compra' },
        { id: 8, key: 'booking', name: 'Reservas', description: 'Reservas/Pedidos' },
        { id: 9, key: 'products', name: 'Productos', description: 'Gestión de Productos' },
        { id: 10, key: 'providers', name: 'Proveedores', description: 'Gestión de Proveedores' },
        { id: 11, key: 'banks', name: 'Bancos', description: 'Cuentas Bancarias' },
        { id: 12, key: 'coins', name: 'Monedas', description: 'Gestión de Monedas' },
        { id: 13, key: 'works', name: 'Trabajos', description: 'Gestión de Trabajos/Proyectos' },
        { id: 14, key: 'cost_centers', name: 'Centros de Costo', description: 'Gestión de Centros de Costo' },
        { id: 15, key: 'positions', name: 'Cargos', description: 'Gestión de Cargos' },
        { id: 16, key: 'cities', name: 'Ciudades', description: 'Gestión de Ciudades' },
        { id: 17, key: 'countries', name: 'Países', description: 'Gestión de Países' },
        { id: 18, key: 'settings', name: 'Configuraciones', description: 'Configuraciones del Sistema' },
        { id: 19, key: 'rols', name: 'Roles', description: 'Gestión de Roles y Permisos' },
        { id: 20, key: 'balances', name: 'Ingresos y Egresos', description: 'Movimientos de ingreso y egreso' },
      ]

      // Insert modules
      for (const module of modules) {
        await Module.updateOrCreate({ key: module.key }, module, { client: trx })
      }

      // Create permissions for each module
      const permissions = [
        // Users module (1)
        { key: 'view', name: 'Ver', description: 'Ver usuarios', type: 'users', moduleId: 1 },
        { key: 'create', name: 'Crear', description: 'Crear usuarios', type: 'users', moduleId: 1 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar usuarios', type: 'users', moduleId: 1 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar usuarios', type: 'users', moduleId: 1 },
        { key: 'managePermissions', name: 'Gestionar Permisos', description: 'Gestionar permisos de usuarios', type: 'users', moduleId: 1 },
        { key: 'resetPassword', name: 'Restablecer Contraseña', description: 'Restablecer contraseñas de usuarios', type: 'users', moduleId: 1 },

        // Business module (2)
        { key: 'view', name: 'Ver', description: 'Ver empresas', type: 'business', moduleId: 2 },
        { key: 'create', name: 'Crear', description: 'Crear empresas', type: 'business', moduleId: 2 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar empresas', type: 'business', moduleId: 2 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar empresas', type: 'business', moduleId: 2 },
        { key: 'manageEmployees', name: 'Gestionar Empleados', description: 'Gestionar empleados de empresas', type: 'business', moduleId: 2 },
        { key: 'manageSalaries', name: 'Gestionar Salarios', description: 'Gestionar salarios de empresas', type: 'business', moduleId: 2 },

        // Employees module (3)
        { key: 'view', name: 'Ver', description: 'Ver empleados', type: 'employees', moduleId: 3 },
        { key: 'create', name: 'Crear', description: 'Crear empleados', type: 'employees', moduleId: 3 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar empleados', type: 'employees', moduleId: 3 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar empleados', type: 'employees', moduleId: 3 },
        { key: 'managePermits', name: 'Gestionar Permisos', description: 'Gestionar permisos de empleados', type: 'employees', moduleId: 3 },
        { key: 'manageLicenses', name: 'Gestionar Licencias', description: 'Gestionar licencias de empleados', type: 'employees', moduleId: 3 },
        { key: 'manageAccess', name: 'Gestionar Acceso', description: 'Gestionar acceso de empleados', type: 'employees', moduleId: 3 },
        { key: 'viewReports', name: 'Ver Reportes', description: 'Ver reportes de empleados', type: 'employees', moduleId: 3 },

        // Clients module (4)
        { key: 'view', name: 'Ver', description: 'Ver clientes', type: 'clients', moduleId: 4 },
        { key: 'create', name: 'Crear', description: 'Crear clientes', type: 'clients', moduleId: 4 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar clientes', type: 'clients', moduleId: 4 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar clientes', type: 'clients', moduleId: 4 },
        { key: 'manageProfiles', name: 'Gestionar Perfiles', description: 'Gestionar perfiles de clientes', type: 'clients', moduleId: 4 },

        // Client Requests module (5)
        { key: 'view', name: 'Ver', description: 'Ver solicitudes de clientes', type: 'clientRequests', moduleId: 5 },
        { key: 'create', name: 'Crear', description: 'Crear solicitudes de clientes', type: 'clientRequests', moduleId: 5 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar solicitudes de clientes', type: 'clientRequests', moduleId: 5 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar solicitudes de clientes', type: 'clientRequests', moduleId: 5 },

        // Bugets/Quotes module (6)
        { key: 'view', name: 'Ver', description: 'Ver presupuestos/cotizaciones', type: 'bugets', moduleId: 6 },
        { key: 'create', name: 'Crear', description: 'Crear presupuestos/cotizaciones', type: 'bugets', moduleId: 6 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar presupuestos/cotizaciones', type: 'bugets', moduleId: 6 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar presupuestos/cotizaciones', type: 'bugets', moduleId: 6 },
        { key: 'search', name: 'Buscar', description: 'Buscar presupuestos/cotizaciones', type: 'bugets', moduleId: 6 },
        { key: 'viewReports', name: 'Ver Reportes', description: 'Ver reportes de presupuestos', type: 'bugets', moduleId: 6 },

        // Shopping/Purchase Orders module (7)
        { key: 'view', name: 'Ver', description: 'Ver órdenes de compra', type: 'shopping', moduleId: 7 },
        { key: 'create', name: 'Crear', description: 'Crear órdenes de compra', type: 'shopping', moduleId: 7 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar órdenes de compra', type: 'shopping', moduleId: 7 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar órdenes de compra', type: 'shopping', moduleId: 7 },
        { key: 'authorize', name: 'Autorizar', description: 'Autorizar órdenes de compra', type: 'shopping', moduleId: 7 },
        { key: 'share', name: 'Compartir', description: 'Compartir órdenes de compra', type: 'shopping', moduleId: 7 },

        // Booking/Orders module (8)
        { key: 'view', name: 'Ver', description: 'Ver bBookings', type: 'booking', moduleId: 8 },
        { key: 'create', name: 'Crear', description: 'Crear bBookings', type: 'booking', moduleId: 8 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar bBookings', type: 'booking', moduleId: 8 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar bBookings', type: 'booking', moduleId: 8 },
        { key: 'search', name: 'Buscar', description: 'Buscar bBookings', type: 'booking', moduleId: 8 },
        { key: 'manageComplements', name: 'Gestionar Complementos', description: 'Gestionar complementos de reservas', type: 'booking', moduleId: 8 },

        // Products module (9)
        { key: 'view', name: 'Ver', description: 'Ver productos', type: 'products', moduleId: 9 },
        { key: 'create', name: 'Crear', description: 'Crear productos', type: 'products', moduleId: 9 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar productos', type: 'products', moduleId: 9 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar productos', type: 'products', moduleId: 9 },
        { key: 'managePhotos', name: 'Gestionar Fotos', description: 'Gestionar fotos de productos', type: 'products', moduleId: 9 },

        // Providers module (10)
        { key: 'view', name: 'Ver', description: 'Ver proveedores', type: 'providers', moduleId: 10 },
        { key: 'create', name: 'Crear', description: 'Crear proveedores', type: 'providers', moduleId: 10 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar proveedores', type: 'providers', moduleId: 10 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar proveedores', type: 'providers', moduleId: 10 },
        { key: 'manageProducts', name: 'Gestionar Productos', description: 'Gestionar productos de proveedores', type: 'providers', moduleId: 10 },

        // Banks module (11)
        { key: 'view', name: 'Ver', description: 'Ver cuentas bancarias', type: 'banks', moduleId: 11 },
        { key: 'create', name: 'Crear', description: 'Crear cuentas bancarias', type: 'banks', moduleId: 11 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar cuentas bancarias', type: 'banks', moduleId: 11 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar cuentas bancarias', type: 'banks', moduleId: 11 },

        // Coins/Currency module (12)
        { key: 'view', name: 'Ver', description: 'Ver monedas', type: 'coins', moduleId: 12 },
        { key: 'create', name: 'Crear', description: 'Crear monedas', type: 'coins', moduleId: 12 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar monedas', type: 'coins', moduleId: 12 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar monedas', type: 'coins', moduleId: 12 },

        // Works/Projects module (13)
        { key: 'view', name: 'Ver', description: 'Ver trabajos/proyectos', type: 'works', moduleId: 13 },
        { key: 'create', name: 'Crear', description: 'Crear trabajos/proyectos', type: 'works', moduleId: 13 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar trabajos/proyectos', type: 'works', moduleId: 13 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar trabajos/proyectos', type: 'works', moduleId: 13 },

        // Cost Centers module (14)
        { key: 'view', name: 'Ver', description: 'Ver centros de costo', type: 'costCenters', moduleId: 14 },
        { key: 'create', name: 'Crear', description: 'Crear centros de costo', type: 'costCenters', moduleId: 14 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar centros de costo', type: 'costCenters', moduleId: 14 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar centros de costo', type: 'costCenters', moduleId: 14 },

        // Positions module (15)
        { key: 'view', name: 'Ver', description: 'Ver cargos', type: 'positions', moduleId: 15 },
        { key: 'create', name: 'Crear', description: 'Crear cargos', type: 'positions', moduleId: 15 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar cargos', type: 'positions', moduleId: 15 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar cargos', type: 'positions', moduleId: 15 },

        // Cities module (16)
        { key: 'view', name: 'Ver', description: 'Ver ciudades', type: 'cities', moduleId: 16 },
        { key: 'create', name: 'Crear', description: 'Crear ciudades', type: 'cities', moduleId: 16 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar ciudades', type: 'cities', moduleId: 16 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar ciudades', type: 'cities', moduleId: 16 },

        // Countries module (17)
        { key: 'view', name: 'Ver', description: 'Ver países', type: 'countries', moduleId: 17 },
        { key: 'create', name: 'Crear', description: 'Crear países', type: 'countries', moduleId: 17 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar países', type: 'countries', moduleId: 17 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar países', type: 'countries', moduleId: 17 },

        // Settings module (18) - Various system settings
        { key: 'view', name: 'Ver', description: 'Ver configuraciones del sistema', type: 'settings', moduleId: 18 },
        { key: 'create', name: 'Crear', description: 'Crear configuraciones del sistema', type: 'settings', moduleId: 18 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar configuraciones del sistema', type: 'settings', moduleId: 18 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar configuraciones del sistema', type: 'settings', moduleId: 18 },
        { key: 'bookingItems', name: 'Items de Reserva', description: 'Gestionar configuraciones de items de reserva', type: 'settings', moduleId: 18 },
        { key: 'bookingProperties', name: 'Propiedades de Reserva', description: 'Gestionar configuraciones de propiedades de reserva', type: 'settings', moduleId: 18 },
        { key: 'bookingNotes', name: 'Notas de Reserva', description: 'Gestionar configuraciones de notas de reserva', type: 'settings', moduleId: 18 },
        { key: 'budgetCategories', name: 'Categorías de Presupuesto', description: 'Gestionar configuraciones de categorías de presupuesto', type: 'settings', moduleId: 18 },
        { key: 'budgetItems', name: 'Items de Presupuesto', description: 'Gestionar configuraciones de items de presupuesto', type: 'settings', moduleId: 18 },
        { key: 'isapres', name: 'Isapres', description: 'Gestionar configuraciones de isapres', type: 'settings', moduleId: 18 },
        { key: 'discounts', name: 'Descuentos', description: 'Gestionar configuraciones de descuentos', type: 'settings', moduleId: 18 },
        { key: 'assets', name: 'Activos', description: 'Gestionar configuraciones de activos', type: 'settings', moduleId: 18 },
        { key: 'afp', name: 'AFP', description: 'Gestionar configuraciones de AFP', type: 'settings', moduleId: 18 },
        { key: 'typeContracts', name: 'Tipos de Contrato', description: 'Gestionar configuraciones de tipos de contrato', type: 'settings', moduleId: 18 },
        { key: 'affiliations', name: 'Afiliaciones', description: 'Gestionar configuraciones de afiliaciones', type: 'settings', moduleId: 18 },
        { key: 'loadFamily', name: 'Carga Familiar', description: 'Gestionar configuraciones de carga familiar', type: 'settings', moduleId: 18 },
        { key: 'layoff', name: 'Despido', description: 'Gestionar configuraciones de despido', type: 'settings', moduleId: 18 },
        { key: 'exregime', name: 'Ex-Régimen', description: 'Gestionar configuraciones de ex-régimen', type: 'settings', moduleId: 18 },
        { key: 'certificateHealthItems', name: 'Items de Certificado de Salud', description: 'Gestionar configuraciones de items de certificado de salud', type: 'settings', moduleId: 18 },
        { key: 'legalGratifications', name: 'Gratificaciones Legales', description: 'Gestionar configuraciones de gratificaciones legales', type: 'settings', moduleId: 18 },
        { key: 'schedules', name: 'Horarios', description: 'Gestionar configuraciones de horarios', type: 'settings', moduleId: 18 },
        { key: 'licenses', name: 'Licencias', description: 'Gestionar configuraciones de licencias', type: 'settings', moduleId: 18 },

        // Roles module (19)
        { key: 'view', name: 'Ver', description: 'Ver roles', type: 'rols', moduleId: 19 },
        { key: 'create', name: 'Crear', description: 'Crear roles', type: 'rols', moduleId: 19 },
        { key: 'update', name: 'Actualizar', description: 'Actualizar roles', type: 'rols', moduleId: 19 },
        { key: 'delete', name: 'Eliminar', description: 'Eliminar roles', type: 'rols', moduleId: 19 },

        // Balances module (20)
        { key: 'view', name: 'Ver', description: 'Ver movimientos de ingresos y egresos', type: 'balances', moduleId: 20 },
      ]

      // Insert permissions
      for (const permission of permissions) {
        await Permission.updateOrCreate({ key: permission.key, moduleId: permission.moduleId }, permission, { client: trx })
      }

      await trx.commit()

    } catch (error) {
      console.log(error)
      await trx.rollback()
      throw error
    }
  }
}