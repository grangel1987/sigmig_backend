import City from '#models/cities/City'
import CityRepository from '#repositories/cities/city_repository'
import PermissionService from '#services/permission_service'
import Util from '#utils/Util'
import { Exception } from '@adonisjs/core/exceptions'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

type MessageFrontEnd = {
  message: string
  title: string
}

export default class CityController {

  public async index(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'cities', 'view')

    const { request, response } = ctx

    const { page, perPage } = await request.validateUsing(vine.compile(vine.object({
      page: vine.number().positive().optional(),
      perPage: vine.number().positive().optional()
    })))

    const cities = await City.query()
      .preload('country', (builder) => {
        builder.select(['id', 'name'])
      })
      .preload('createdBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      .preload('updatedBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      }).paginate(page || 1, perPage || 10)

    return response.ok(cities)
  }

  public async store(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'cities', 'create')

    const { request, response, auth, i18n } = ctx
    const { countryId, name } = await request.validateUsing(
      vine.compile(
        vine.object({
          countryId: vine.number().positive(),
          name: vine.string().trim().minLength(1),
        })
      )
    )
    const tz = await Util.getTimeZone()
    const dateTime = DateTime.now().setZone(tz)
    try {
      const city = await City.create({
        countryId: countryId,
        name,
        createdById: auth.user!.id,
        updatedById: auth.user!.id,
        createdAt: dateTime,
        updatedAt: dateTime,
      })

      await city.load('country', (builder) => {
        builder.select(['id', 'name'])
      })
      await city.load('createdBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      await city.load('updatedBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })

      return response.status(201).json({
        city,
        message: i18n.formatMessage('messages.store_ok'),
        title: i18n.formatMessage('messages.ok_title'),
      } as MessageFrontEnd)
    } catch (error) {
      console.log(error);
      throw new Exception(i18n.formatMessage('messages.store_error'))
    }
  }

  public async update(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'cities', 'update')

    const { params, request, response, auth, i18n } = ctx
    const cityId = params.id
    const { countryId, name } = await request.validateUsing(vine.compile(vine.object({
      countryId: vine.number().positive().optional(),
      name: vine.string().trim().minLength(1).optional()
    })))
    const dateTime = DateTime.local()

    try {
      const city = await City.findOrFail(cityId)

      city.merge({
        name,
        countryId,
        updatedById: auth.user!.id,
        updatedAt: dateTime,
      })

      console.log(city.serialize());

      await city.save()

      await city.load('country', (builder) => {
        builder.select(['id', 'name'])
      })
      await city.load('createdBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      await city.load('updatedBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })

      return response.status(201).json({
        city,
        message: i18n.formatMessage('messages.update_ok'),
        title: i18n.formatMessage('messages.ok_title'),
      } as MessageFrontEnd)
    } catch (error) {
      throw error
    }
  }

  public async changeStatus(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'cities', 'update')

    const { params, response, auth, i18n } = ctx
    const cityId = params.id
    const dateTime = DateTime.local()

    try {
      const city = await City.findOrFail(cityId)
      const status = !city.enabled
      city.merge({
        enabled: status,
        updatedById: auth.user!.id,
        updatedAt: dateTime,
      })
      await city.save()

      await city.load('country', (builder) => {
        builder.select(['id', 'name'])
      })
      await city.load('createdBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      await city.load('updatedBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })

      return response.status(201).json({
        city,
        message: i18n.formatMessage(city.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
        title: i18n.formatMessage('messages.ok_title'),
      } as MessageFrontEnd)
    } catch (error) {
      throw new Exception(i18n.formatMessage('messages.update_error'))
    }
  }

  public async findByCountry(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'cities', 'view')

    const { request, response, i18n } = ctx
    // Validate pagination from querystring
    const { page, perPage } = await request.validateUsing(
      vine.compile(
        vine.object({
          page: vine.number().positive().optional(),
          perPage: vine.number().positive().optional(),
        })
      )
    )

    // Validate required param country_id
    const { country_id } = request.params()

    console.log(request.params());

    const countryId = Number(country_id)
    if (!country_id || Number.isNaN(countryId) || countryId <= 0) {
      return response.status(422).json({
        message: i18n.formatMessage('messages.update_error'),
        title: i18n.formatMessage('messages.error_title'),
      } as MessageFrontEnd)
    }

    const query = City.query()
      .where('countryId', countryId)
      .select(['id', 'name'])
    const cities = await (page ? query.paginate(page || 1, perPage || 10) : query)

    return response.ok(cities)
  }

  public async select(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'cities', 'view')

    const { request, response, i18n } = ctx
    const { country_id } = request.params()
    const countryId = Number(country_id)
    if (!country_id || Number.isNaN(countryId) || countryId <= 0) {
      return response.status(422).json({
        message: i18n.formatMessage('messages.update_error'),
        title: i18n.formatMessage('messages.error_title'),
      } as MessageFrontEnd)
    }
    const cities = await CityRepository.select(countryId)
    return response.ok(cities)
  }
}