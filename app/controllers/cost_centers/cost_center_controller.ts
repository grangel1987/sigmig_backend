import CostCenter from '#models/cost_centers/cost_center'
import CostCenterRepository from '#repositories/cost_centers/cost_center_repository'
import PermissionService from '#services/permission_service'
import { searchWithStatusSchema } from '#validators/general'
import { Exception } from '@adonisjs/core/exceptions'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import console from 'console'
import { DateTime } from 'luxon'

type MessageFrontEnd = {
  message: string
  title: string
}

export default class CostCenterController {

  public async index(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'cost_centers', 'view')

    const { request, response, auth } = ctx

    const { page, perPage, text, status, accounting } = await request.validateUsing(vine.compile(
      vine.object({
        ...searchWithStatusSchema.getProperties(), accounting: vine.boolean().optional()

      })))

    try {
      const userId = auth.user!.id
      const userBusiness = await CostCenter.query()
        .from('business_users')
        .where('selected', 1)
        .where('user_id', userId)
        .firstOrFail()
      const businessId = userBusiness.businessId

      let query = CostCenter.query().where('business_id', businessId)
        .preload('createdBy', (builder) => {
          builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
        })
        .preload('updatedBy', (builder) => {
          builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
        })

      if (text) {
        const like = `%${text}%`
        query.where((qb) => qb.whereRaw('name LIKE ?', [like]).orWhereRaw('code LIKE ?', [like]))
      }

      if (accounting !== undefined)
        query.where('accounting', Boolean(accounting))


      if (status !== undefined) query.where('enabled', status === 'enabled')

      const costCenters = await query.paginate(page || 1, perPage || 10)
      response.ok(costCenters)
    } catch (error) {
      throw error
    }
  }

  public async store(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'cost_centers', 'create')

    const { auth, request, response, i18n } = ctx
    const { businessId, name, code, accounting } = await request.validateUsing(vine.compile(vine.object({
      businessId: vine.number().positive(),
      name: vine.string().trim(),
      code: vine.string().trim(),
      accounting: vine.boolean().optional(),
    })))
    const dateTime = DateTime.local()

    try {
      const data = {
        businessId,
        name,
        accounting,
        code,
        createdAt: dateTime,
        updatedAt: dateTime,
        createdById: auth.user!.id,
        updatedById: auth.user!.id,
      }

      const costCenter = await CostCenter.create(data)

      await costCenter.load('createdBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      await costCenter.load('updatedBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })

      return response.status(201).json({
        costCenter,
        message: i18n.formatMessage('messages.store_ok'),
        title: i18n.formatMessage('messages.ok_title'),
      } as MessageFrontEnd)
    } catch (error) {
      throw new Exception(i18n.formatMessage('messages.store_error'))
    }
  }

  public async update(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'cost_centers', 'update')

    const { params, request, response, auth, i18n } = ctx
    const costCenterId = params.id
    const { name, code, accounting } = await request.validateUsing(vine.compile(vine.object({
      name: vine.string().trim().optional(),
      code: vine.string().trim().optional(),
      accounting: vine.boolean().optional(),
    })))
    const dateTime = DateTime.local()

    try {
      const costCenter = await CostCenter.findOrFail(costCenterId)

      costCenter.merge({
        accounting,
        name,
        code,
        updatedAt: dateTime,
        updatedById: auth.user!.id,
      })
      await costCenter.save()

      await costCenter.load('createdBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      await costCenter.load('updatedBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })

      return response.status(201).json({
        costCenter,
        message: i18n.formatMessage('messages.update_ok'),
        title: i18n.formatMessage('messages.ok_title'),
      } as MessageFrontEnd)
    } catch (error) {
      throw new Exception(i18n.formatMessage('messages.update_error'))
    }
  }

  public async changeStatus(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'cost_centers', 'update')

    const { params, response, auth, i18n } = ctx
    const costCenterId = params.id
    const dateTime = DateTime.local()

    try {
      const costCenter = await CostCenter.findOrFail(costCenterId)
      const status = !costCenter.enabled
      costCenter.merge({
        enabled: status,
        updatedById: auth.user!.id,
        updatedAt: dateTime,
      })
      await costCenter.save()

      await costCenter.load('createdBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      await costCenter.load('updatedBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })

      return response.status(201).json({
        costCenter,
        message: i18n.formatMessage(costCenter.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
        title: i18n.formatMessage('messages.ok_title'),
      } as MessageFrontEnd)
    } catch (error) {
      throw new Exception(i18n.formatMessage('messages.update_error'))
    }
  }

  public async findAll(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'cost_centers', 'view')

    const { params } = ctx
    const business_id = params.business_id
    const costCenters = await CostCenter.query()
      .select(['id', 'code', 'name'])
      .where('business_id', business_id)
      .where('enabled', true)

    return costCenters
  }

  public async select(ctx: HttpContext) {
    // await PermissionService.requirePermission(ctx, 'cost_centers', 'view')

    const { request } = ctx
    const { params } = await request.validateUsing(vine.compile(vine.object({
      params: vine.object({ business_id: vine.number().positive() })
    })))
    try {

      const businessId = params.business_id
      const costCenters = await CostCenterRepository.select(businessId)

      const result = costCenters.map((costCenter) => ({
        text: `${costCenter.code} - ${costCenter.name}`,
        value: costCenter.id,
      }))

      return result
    } catch (error) {
      console.log(error);

      throw new Exception('Failed to fetch cost centers for select')
    }
  }
}