import Country from '#models/countries/country'
import CountryRepository from '#repositories/countries/country_repository'
import PermissionService from '#services/permission_service'
import messageFrontEnd from '#utils/MessageFrontEnd'
import { countryUpdateValidator } from '#validators/country'
import { indexFiltersWithStatus } from '#validators/general'
import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

export default class CountryController {
  public async index(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'countries', 'view')

    const { request } = ctx

    const { page, perPage, text, status } = await request.validateUsing(indexFiltersWithStatus)
    const query = Country.query()

    if (text) {
      const likeVal = `%${text}%`
      query.where((qb) => {
        qb.whereILike('name', likeVal).orWhereILike('nationality', likeVal).orWhereILike('code', likeVal)
      })
    }

    if (status !== undefined) {
      query.where('enabled', status === 'enabled')
    }

    const countries = await query
      .preload('createdBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })
      .preload('updatedBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })
      .paginate(page || 1, perPage || 10)

    return countries
  }

  public async select(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'countries', 'view')
    const countries = await CountryRepository.select()
    return countries
  }

  public async update(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'countries', 'update')

    const { params, request, response, auth, i18n } = ctx
    const countryId = params.id
    const dateTime = DateTime.local()
    const { name, prefix, nationality } = await request.validateUsing(countryUpdateValidator)

    try {
      const country = await Country.findOrFail(countryId)

      const payload: Record<string, unknown> = {}
      if (name !== undefined) payload.name = name
      if (prefix !== undefined) payload.phoneCode = prefix
      if (nationality !== undefined) payload.nationality = nationality
      country.merge({
        ...payload,
        updatedById: auth.user!.id,
        updatedAt: dateTime,
      })
      await country.save()

      await country.load('createdBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })
      await country.load('updatedBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })

      return response.status(201).json({
        country,
        message: i18n.formatMessage('messages.update_ok'),
        title: i18n.formatMessage('messages.ok_title'),
      })
    } catch (error) {
      return response.status(500).json({
        ...messageFrontEnd(
          i18n.formatMessage('messages.update_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }
}
