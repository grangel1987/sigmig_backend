import Country from '#models/countries/country'
import CountryRepository from '#repositories/countries/country_repository'
import messageFrontEnd from '#utils/MessageFrontEnd'
import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'


export default class CountryController {

  public async index({ request }: HttpContext) {
    const { params, page, perPage } = request.all()
    let query = Country.query()

    if (params) {
      query.where('name', 'LIKE', `${params}%`)
    }

    const countries = await query
      .preload('createdBy', (builder) => {
        builder.select(['id', 'full_name', 'email'])
      })
      .preload('updatedBy', (builder) => {
        builder.select(['id', 'full_name', 'email'])
      })
      .paginate(page || 1, perPage || 10)

    return countries
  }

  public async select() {
    const countries = await CountryRepository.select()
    return countries
  }

  public async update({ params, request, response, auth, i18n }: HttpContext) {
    const countryId = params.id
    const dateTime = DateTime.local()
    const { name, prefix, nationality } = request.all()

    try {
      const country = await Country.findOrFail(countryId)

      country.merge({
        name,
        phone_code: prefix,
        nationality,
        updated_by: auth.user!.id,
        updated_at: dateTime,
      })
      await country.save()

      await country.load('createdBy', (builder) => {
        builder.select(['id', 'full_name', 'email'])
      })
      await country.load('updatedBy', (builder) => {
        builder.select(['id', 'full_name', 'email'])
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
        )
      })
    }
  }
}