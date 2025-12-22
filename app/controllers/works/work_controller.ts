import BusinessUser from '#models/business/business_user'
import Work from '#models/works/work'
import WorksRepository from '#repositories/works/works_repository'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { searchWithStatusSchema } from '#validators/general'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

type MessageFrontEnd = {
  message: string
  title: string
}

export default class WorkController {

  public async index(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'works', 'view')

    const { request, auth, response, i18n } = ctx

    const { page, perPage, text, status } = await request.validateUsing(vine.compile(searchWithStatusSchema))

    try {
      const userId = auth.user!.id

      console.log({ userId });

      const business = await BusinessUser.query()
        .from('business_users')
        .where('selected', 1)
        .where('user_id', userId)
        .firstOrFail()
      const businessId = business.businessId

      const workQuery = Work.query()
        .where('business_id', businessId)
        .preload('createdBy', (builder) => {
          builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
        })
        .preload('updatedBy', (builder) => {
          builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
        })

      if (status)
        workQuery.where('enabled', status === 'enabled' ? true : false)

      if (text)
        workQuery.where((query) => {
          query.where('name', 'like', `%${text}%`)
            .orWhere('code', 'like', `%${text}%`)
        })

      const works = await (page ? workQuery.paginate(page, perPage || 10) : workQuery)

      return works
    } catch (error) {
      console.log(error);

      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_error'),
          i18n.formatMessage('messages.error_title')
        )
      })
    }
  }

  public async store(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'works', 'create')

    const { auth, request, response, i18n } = ctx
    const { businessId, name, code, lat, log } = await request.validateUsing(
      vine.compile(
        vine.object({
          businessId: vine.number().positive(),
          name: vine.string().trim(),
          code: vine.string().trim(),
          lat: vine.number().optional(),
          log: vine.number().optional(),
        })
      )
    )
    const dateTime = DateTime.local()

    try {
      const data = {
        businessId,
        name,
        code,
        lat,
        log,
        createdAt: dateTime,
        updatedAt: dateTime,
        createdById: auth.user!.id,
        updatedById: auth.user!.id,
      }

      const work = await Work.create(data)

      await work.load('createdBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      await work.load('updatedBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })

      return response.status(201).json({
        work,
        message: i18n.formatMessage('messages.store_ok'),
        title: i18n.formatMessage('messages.ok_title'),
      } as MessageFrontEnd)
    } catch (error) {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_error'),
          i18n.formatMessage('messages.error_title')
        )
      })
    }
  }

  public async update(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'works', 'update')

    const { params, request, response, auth, i18n } = ctx
    const workId = params.id
    const { name, code, lat, log } = await request.validateUsing(
      vine.compile(
        vine.object({
          name: vine.string().trim().optional(),
          code: vine.string().trim().optional(),
          lat: vine.number().optional(),
          log: vine.number().optional(),
        })
      )
    )
    const dateTime = DateTime.local()

    try {
      const work = await Work.findOrFail(workId)

      work.merge({
        name,
        code,
        lat,
        log,
        updatedAt: dateTime,
        updatedById: auth.user!.id,
      })
      await work.save()

      await work.load('createdBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      await work.load('updatedBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })

      return response.status(201).json({
        work,
        message: i18n.formatMessage('messages.update_ok'),
        title: i18n.formatMessage('messages.ok_title'),
      } as MessageFrontEnd)
    } catch (error) {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_error'),
          i18n.formatMessage('messages.error_title')
        )
      })
    }
  }

  public async changeStatus(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'works', 'update')

    const { params, response, auth, i18n } = ctx
    const workId = params.id
    const dateTime = DateTime.local()

    try {
      const work = await Work.findOrFail(workId)
      const status = !work.enabled
      work.merge({
        enabled: status,
        updatedById: auth.user!.id,
        updatedAt: dateTime,
      })
      await work.save()

      await work.load('createdBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      await work.load('updatedBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })

      return response.status(201).json({
        work,
        message: i18n.formatMessage(work.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
        title: i18n.formatMessage('messages.ok_title'),
      } as MessageFrontEnd)
    } catch (error) {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_error'),
          i18n.formatMessage('messages.error_title')
        )
      })
    }
  }

  public async findAll(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'works', 'view')

    const { params } = ctx
    const business_id = params.business_id
    const works = await Work.query()
      .select(['id', 'code', 'name'])
      .where('enabled', true)
      .where('business_id', business_id)

    return works
  }

  public async select(ctx: HttpContext) {
    // await PermissionService.requirePermission(ctx, 'works', 'view')

    const { auth, response, i18n } = ctx
    try {
      const userId = auth.user!.id
      const business = await Work.query()
        .from('business_users')
        .where('selected', 1)
        .where('user_id', userId)
        .firstOrFail()
      const businessId = business.businessId

      const works = await WorksRepository.select(businessId)
      return works
    } catch (error) {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_error'),
          i18n.formatMessage('messages.error_title')
        )
      })
    }
  }
}