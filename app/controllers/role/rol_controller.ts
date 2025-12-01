import Permission from '#models/permissions/permission'
import Rol from '#models/role/rol'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { indexFiltersWithStatus } from '#validators/general'
import { Exception } from '@adonisjs/core/exceptions'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

export default class RolController {

    public async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'rols', 'view')

        const { request, response } = ctx

        const { page, perPage, text, status } = await request.validateUsing(indexFiltersWithStatus)
        let businessId

        businessId = request.header('Business')
        if (!businessId) {
            await ctx.auth.user?.loadOnce('selectedBusiness')
            const selected = ctx.auth.user?.selectedBusiness
            businessId = selected?.id
        }

        const rolQ = Rol.query()
            .where('enabled', true)
            .preload('permissions', (builder) => {
                builder.preload('module', (moduleBuilder) => {
                    moduleBuilder.select(['id', 'name'])
                })
            })
            .preload('createdBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            .preload('updatedBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

        if (businessId) rolQ.where('business_id', businessId)

        if (text) rolQ.where('name', 'LIKE', `%${text}%`)
        if (status) rolQ.where('enabled', status === 'enabled' ? 1 : 0)

        const roles = await rolQ
            .paginate(page || 1, perPage || 10)


        return response.ok(roles)
    }

    public async store(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'roles', 'create')

        const { request, response, auth, i18n } = ctx
        const { name, description, businessId, permissions } = await request.validateUsing(
            vine.compile(
                vine.object({
                    name: vine.string().trim().minLength(1).maxLength(250),
                    description: vine.string().trim().optional(),
                    businessId: vine.number().positive().optional(),
                    permissions: vine.array(vine.number().positive().exists({ table: 'permissions', column: 'id' }))
                })
            )
        )

        const role = await db.transaction(async (trx) => {

            const cRole = await Rol.create({
                name,
                description,
                businessId,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
            }, { client: trx })

            await cRole.related('permissions').attach(permissions, trx)

            return cRole
        })

        await role.load('permissions')
        if (role.createdById) await role.load('createdBy', (builder) => {
            builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
        })
        if (role.updatedById) await role.load('updatedBy', (builder) => {
            builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
        })

        return response.created({
            ...MessageFrontEnd(
                i18n.formatMessage('messages.store_ok'),
                i18n.formatMessage('messages.ok_title')
            ),
            data: role
        })
    }

    public async show(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'roles', 'view')

        const { params, response } = ctx

        const role = await Rol.query()
            .where('id', params.id)
            .where('enabled', true)
            .preload('permissions', (builder) => {
                builder.preload('module', (moduleBuilder) => {
                    moduleBuilder.select(['id', 'name'])
                })
            })
            .preload('createdBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            .preload('updatedBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            .first()

        if (!role) {
            throw new Exception('Role not found', {
                status: 404,
                code: 'ROLE_NOT_FOUND'
            })
        }

        return response.ok(role)
    }

    public async update(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'roles', 'update')

        const { params, request, response, auth, i18n } = ctx
        const { name, description, permissions } = await request.validateUsing(
            vine.compile(
                vine.object({
                    name: vine.string().trim().minLength(1).maxLength(250),
                    description: vine.string().trim().optional(),
                    // businessId: vine.number().positive().optional(),
                    permissions: vine.array(vine.number().positive().exists({ table: 'permissions', column: 'id' }))

                })
            )
        )



        const role = await Rol.findOrFail(params.id)


        const res = await db.transaction(async (trx) => {
            role.useTransaction(trx)
            role.merge({
                name,
                description,
                updatedById: auth.user!.id,
            })
            await role.save()
            await role.related('permissions').sync(permissions, true, trx)
            return role
        })

        await res.load('permissions')
        if (res.createdById) await res.load('createdBy', (builder) => {
            builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
        })
        if (res.updatedById) await res.load('updatedBy', (builder) => {
            builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
        })


        return response.ok({
            ...MessageFrontEnd(
                i18n.formatMessage('messages.updated_ok'),
                i18n.formatMessage('messages.ok_title')
            ),
            data: res
        })
    }

    public async destroy(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'roles', 'delete')

        const { params, response, i18n } = ctx

        const role = await Rol.query()
            .where('id', params.id)
            .where('enabled', true)
            .first()

        if (!role) {
            throw new Exception('Role not found', {
                status: 404,
                code: 'ROLE_NOT_FOUND'
            })
        }

        // Check if role is a system role
        if (role.isSystem) {
            throw new Exception('Cannot delete system role', {
                status: 400,
                code: 'CANNOT_DELETE_SYSTEM_ROLE'
            })
        }

        role.enabled = false
        await role.save()

        return response.ok({
            ...MessageFrontEnd(
                i18n.formatMessage('messages.delete_ok'),
                i18n.formatMessage('messages.ok_title')
            )
        })
    }

    public async attachPermissions(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'roles', 'managePermissions')

        const { params, request, response, i18n } = ctx
        const { permissionIds } = await request.validateUsing(
            vine.compile(
                vine.object({
                    permissionIds: vine.array(vine.number().positive()),
                })
            )
        )

        const role = await Rol.query()
            .where('id', params.id)
            .where('enabled', true)
            .first()

        if (!role) {
            throw new Exception('Role not found', {
                status: 404,
                code: 'ROLE_NOT_FOUND'
            })
        }

        // Verify all permissions exist
        const permissions = await Permission.query()
            .whereIn('id', permissionIds)

        if (permissions.length !== permissionIds.length) {
            throw new Exception('One or more permissions not found', {
                status: 400,
                code: 'PERMISSION_NOT_FOUND'
            })
        }

        await role.related('permissions').attach(permissionIds)

        return response.ok({
            ...MessageFrontEnd(
                i18n.formatMessage('messages.update_ok'),
                i18n.formatMessage('messages.ok_title')
            )
        })
    }

    public async detachPermissions(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'roles', 'managePermissions')

        const { params, request, response, i18n } = ctx
        const { permissionIds } = await request.validateUsing(
            vine.compile(
                vine.object({
                    permissionIds: vine.array(vine.number().positive()),
                })
            )
        )

        const role = await Rol.query()
            .where('id', params.id)
            .where('enabled', true)
            .first()

        if (!role) {
            throw new Exception('Role not found', {
                status: 404,
                code: 'ROLE_NOT_FOUND'
            })
        }

        await role.related('permissions').detach(permissionIds)

        return response.ok({
            message: i18n.t('messages.permissions_detached_successfully')
        })
    }

    public async getPermissions(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'roles', 'view')

        const { params, response } = ctx

        const role = await Rol.query()
            .where('id', params.id)
            .where('enabled', true)
            .preload('permissions', (builder) => {
                builder.preload('module', (moduleBuilder) => {
                    moduleBuilder.select(['id', 'name'])
                })
            })
            .first()

        if (!role) {
            throw new Exception('Role not found', {
                status: 404,
                code: 'ROLE_NOT_FOUND'
            })
        }

        return response.ok(role.permissions)
    }

    public async toggleStatus(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'roles', 'update')

        const { params, response, auth, i18n } = ctx
        const roleId = params.id
        const dateTime = DateTime.local()

        try {
            const role = await Rol.findOrFail(roleId)

            // Check if role is a system role
            if (role.isSystem) {
                throw new Exception('Cannot change status of system role', {
                    status: 400,
                    code: 'CANNOT_CHANGE_SYSTEM_ROLE_STATUS'
                })
            }

            const status = !role.enabled
            role.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await role.save()

            await role.load('permissions', (builder) => {
                builder.preload('module', (moduleBuilder) => {
                    moduleBuilder.select(['id', 'name'])
                })
            })
            if (role.createdById) await role.load('createdBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            if (role.updatedById) await role.load('updatedBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(200).json({
                role,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.updated_ok'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            return response.status(500).json({
                message: i18n.formatMessage('messages.update_error'),
                title: i18n.formatMessage('messages.error_title')
            })
        }
    }

    public async select(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'roles', 'view')

        const { response } = ctx

        const roles = await Rol.query()
            .where('enabled', true)
            .select(['id', 'name', 'description'])
            .preload('permissions', (builder) => {
                builder.select(['id', 'name', 'key', 'type'])
                    .preload('module', (moduleBuilder) => {
                        moduleBuilder.select(['id', 'name'])
                    })
            })
            .orderBy('name')

        return response.ok(roles)
    }
}