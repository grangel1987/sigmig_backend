import City from '#models/cities/City'
import CityRepository from '#repositories/cities/city_repository'
import { Exception } from '@adonisjs/core/exceptions'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

type MessageFrontEnd = {
  message: string
  title: string
}

export default class CityController {

  public async index({ request, response }: HttpContext) {

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

  public async store({ request, response, auth, i18n }: HttpContext) {
    const { country_id, name } = request.all()
    const dateTime = DateTime.local()

    try {
      const payload = {
        country_id,
        name,
        createdBy: auth.user!.id,
        updatedBy: auth.user!.id,
        createdAt: dateTime,
        updatedAt: dateTime,
      }
      const city = await City.create(payload)

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
      throw new Exception(i18n.formatMessage('messages.store_error'))
    }
  }

  public async update({ params, request, response, auth, i18n }: HttpContext) {
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

  public async changeStatus({ params, response, auth, i18n }: HttpContext) {
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

  public async findByCountry({ request }: HttpContext) {
    const { countryId } = request.all()
    const cities = await City.query()
      .where('country_id', countryId)
      .select(['id', 'name'])

    return cities
  }

  public async select({ request }: HttpContext) {

    const { countryId } = await request.validateUsing(vine.compile(vine.object({
      countryId: vine.number().positive()
    })))
    const cities = await CityRepository.select(countryId)
    return cities
  }
}