import CostCenter from '#models/cost_centers/cost_center'
import CostCenterRepository from '#repositories/cost_centers/cost_center_repository'
import { Exception } from '@adonisjs/core/exceptions'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

type MessageFrontEnd = {
  message: string
  title: string
}

export default class CostCenterController {

  public async index({ request, response, auth }: HttpContext) {

    const { page, perPage } = await request.validateUsing(vine.compile(vine.object({
      page: vine.number().positive().optional(),
      perPage: vine.number().positive().optional()
    })))

    try {
      const userId = auth.user!.id
      const userBusiness = await CostCenter.query()
        .from('business_users')
        .where('selected', 1)
        .where('user_id', userId)
        .firstOrFail()
      const businessId = userBusiness.businessId

      const costCenters = await CostCenter.query()
        .where('business_id', businessId)
        .preload('createdBy', (builder) => {
          builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
        })
        .preload('updatedBy', (builder) => {
          builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
        }).paginate(page || 1, perPage || 10)

      response.ok(costCenters)
    } catch (error) {
      throw error
    }
  }

  public async store({ auth, request, response, i18n }: HttpContext) {
    const { business_id, name, code } = request.all()
    const dateTime = DateTime.local()

    try {
      const data = {
        business_id,
        name,
        code,
        created_at: dateTime,
        updatedAt: dateTime,
        created_by: auth.user!.id,
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

  public async update({ params, request, response, auth, i18n }: HttpContext) {
    const costCenterId = params.id
    const { name, code } = request.all()
    const dateTime = DateTime.local()

    try {
      const costCenter = await CostCenter.findOrFail(costCenterId)

      costCenter.merge({
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

  public async changeStatus({ params, response, auth, i18n }: HttpContext) {
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

  public async findAll({ params }: HttpContext) {
    const business_id = params.business_id
    const costCenters = await CostCenter.query()
      .select(['id', 'code', 'name'])
      .where('business_id', business_id)
      .where('enabled', true)

    return costCenters
  }

  public async select({ request }: HttpContext) {
    try {
      const { business_id } = await request.validateUsing(vine.compile(vine.object({
        business_id: vine.number().positive()
      })))
      const costCenters = await CostCenterRepository.select(business_id)

      const result = costCenters.map((costCenter) => ({
        text: `${costCenter.code} - ${costCenter.name}`,
        value: costCenter.id,
      }))

      return result
    } catch (error) {
      throw new Exception('Failed to fetch cost centers for select')
    }
  }
}