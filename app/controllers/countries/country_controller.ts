import Country from '#models/countries/country'
import CountryRepository from '#repositories/countries/country_repository'
import messageFrontEnd from '#utils/MessageFrontEnd'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { log } from 'console'
import { DateTime } from 'luxon'


export default class CountryController {

  public async index({ request }: HttpContext) {

    const { page, perPage, text } = await request.validateUsing(vine.compile(vine.object({
      page: vine.number().positive().optional(),
      perPage: vine.number().positive().optional(),
      text: vine.string().trim().optional()
    })))
    let query = Country.query()

    log(text)

    if (text) {
      query.where('name', 'LIKE', `${text}%`)
    }

    const countries = await query
      .preload('createdBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      .preload('updatedBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
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
    const { name, prefix, nationality } = await request.validateUsing(vine.compile(vine.object({
      name: vine.string().trim().minLength(1).optional(),
      prefix: vine.string().trim().minLength(1).optional(),
      nationality: vine.string().trim().minLength(1).optional()
    })))

    try {
      const country = await Country.findOrFail(countryId)

      country.merge({
        name,
        phoneCode: prefix,
        nationality,
        updatedById: auth.user!.id,
        updatedAt: dateTime,
      })
      await country.save()

      await country.load('createdBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      await country.load('updatedBy', (builder) => {
        builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
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