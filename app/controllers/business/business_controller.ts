import Business from '#models/business/business'
import BusinessRepository from '#repositories/business/business_repository'
import { Google } from '#utils/Google'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

interface BusinessPayload {
  country_id: number
  type_identify_id: number
  identify: string
  name: string
  address: string
  phone: string
  email: string
  authorization_minor: boolean
  days_expire_buget: number
  created_at: DateTime
  created_by: number
  updated_at: DateTime
  updated_by: number
  email_confirm_inactive_employee: boolean
}

export default class BusinessController {
  public async store({ request, response, auth, i18n }: HttpContext) {
    const trx = await db.transaction()
    const dateTime = await Util.getDateTimes(request.ip())

    const {
      name,
      country_id,
      type_identify_id,
      identify,
      address,
      phone,
      email,
      days_expire_buget,
      coins,
      del_name,
      del_type_identify_id,
      del_identify,
      del_phone,
      del_email,
      authorization_minor,
      email_confirm_inactive_employee,
    } = request.all()

    const photo = request.file('photo', { size: '2mb', extnames: ['jpg', 'png', 'jpeg', 'webp',] })

    if (!photo)

      try {
        const payload: BusinessPayload = {
          country_id: parseInt(country_id, 10),
          type_identify_id: parseInt(type_identify_id, 10),
          identify,
          name,
          address,
          phone,
          email,
          authorization_minor: authorization_minor === 'true',
          days_expire_buget: parseInt(days_expire_buget, 10),
          created_at: dateTime,
          created_by: auth.user!.id,
          updated_at: dateTime,
          updated_by: auth.user!.id,
          email_confirm_inactive_employee: email_confirm_inactive_employee === 'true',
        }

        const delegatePayload = {
          name: del_name,
          type_identify_id: del_type_identify_id,
          identify: del_identify,
          phone: del_phone,
          email: del_email,
        }

        const business = await Business.create(payload, { client: trx })

        await business.related('delegate').create(delegatePayload, { client: trx })

        if (photo) {
          const res = await Google.uploadFile(photo, 'business', 'image')

          await business.merge(res).useTransaction(trx).save()

          if (coins) {
            const parsedCoins = JSON.parse(coins)

            await trx.from('business_coins').where('business_id', business.id).delete()

            const coinsData = parsedCoins.map((coinId: number, index: number) => ({
              business_id: business.id,
              coin_id: coinId,
              is_default: index === 0 ? 1 : 0,
            }))

            await business.related('coins').createMany(coinsData, { client: trx })
          }

          await trx.commit()

          await business.load('country')
          await business.load('typeIdentify')
          await business.load('delegate')
          await business.load('coins', (builder) => {
            builder.preload('coins')
          })

          return response.status(201).json({
            business,
            ...MessageFrontEnd(
              i18n.formatMessage('messages.update_ok'),
              i18n.formatMessage('messages.ok_title')
            ),
          })
        }
      } catch (error) {
        await trx.rollback()
        logger.error('store: Error', { error: error.message })
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.update_error'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
  }


  /** -----------------------------------------------------------------
   *  FIND ALL BUSINESSES FOR LOGGED USER + COINS + TAXES
   *  ----------------------------------------------------------------- */
  public async findBusinessByUser({ auth }: HttpContext) {
    const userId = auth.user!.id

    const businesses = await BusinessRepository.findBusinessByUser(userId)
    const businessCoins = await BusinessRepository.findBusinessCoins(userId)
    const businessTaxes = await BusinessRepository.findBusinessTaxes(userId)

    for (const business of businesses) {
      const bid = business.id
      business.coins = businessCoins.filter((c) => c.business_id === bid)
      business.taxes = businessTaxes
        .filter((t) => t.business_id === bid)
    }

    return businesses
  }

  /** -----------------------------------------------------------------
   *  CHANGE SELECTED BUSINESS (pivot table business_users)
   *  ----------------------------------------------------------------- */
  public async changeBusiness({ params, auth, response, i18n }: HttpContext) {
    const { id: businessId } = params
    const userId = auth.user!.id

    try {
      await db.from('business_users')
        .where('user_id', userId)
        .update({ selected: 0 })

      await db.from('business_users')
        .where({ user_id: userId, business_id: businessId })
        .update({ selected: 1 })
    } catch (err) {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }

    return response.ok({ success: true })
  }

  /** -----------------------------------------------------------------
   *  SHOW ONE BUSINESS (with coins & delegate)
   *  ----------------------------------------------------------------- */
  public async show({ params, response, i18n }: HttpContext) {
    const business = await BusinessRepository.findBusinessOneById(params.id)

    if (business) {
      const coins = await BusinessRepository.findBusinessOneCoins(params.id)
      const delegate = await BusinessRepository.findBusinessDelegate(params.id)

      if (coins) business.coins = coins
      if (delegate) business.delegate = delegate

      return business
    } else return response.status(422).json({
      ...MessageFrontEnd(
        i18n.formatMessage('data.not_found'),
        i18n.formatMessage('messages.error_title')
      ),
    })
  }


  /** -----------------------------------------------------------------
   *  DELETE PHOTO (GCS)
   *  ----------------------------------------------------------------- */
  public async deletePhoto({ params, response, i18n }: HttpContext) {
    const business = await Business.findOrFail(params.id)
    const { url_short, url_thumb_short } = business

    if (url_short) {
      try {
        await Google.deleteFile(url_short)
        await Google.deleteFile(url_thumb_short!)

      } catch (e) {
        console.error(e)
        return response.status(400).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.delete_error'),
            i18n.formatMessage('messages.ok_title')
          ),
        })
      }
    }

    business.url = ''
    business.url_short = ''
    business.url_thumb = ''
    business.url_thumb_short = ''
    await business.save()

    await business.load('country', (b) => b.select('name as country'))
    await business.load('typeIdentify', (b) => b.select('text as type_identify'))
    await business.load('coins', (b) => b.preload('coins'))

    return response.status(201).json({
      business,
      ...MessageFrontEnd(
        i18n.formatMessage('messages.ok_delete'),
        i18n.formatMessage('messages.ok_title')
      ),
    })
  }

  /** -----------------------------------------------------------------
   *  UPDATE BUSINESS (full flow – photo, delegate, coins, transaction)
   *  ----------------------------------------------------------------- */
  public async update({
    params,
    request,
    response,
    auth,
    i18n,
  }: HttpContext) {
    const businessId = Number(params.id)
    const userId = auth.user!.id
    const ip = request.ip()
    const dateTime = await Util.getDateTimes(ip)

    const {
      name,
      country_id,
      type_identify_id,
      identify,
      address,
      phone,
      email,
      days_expire_buget,
      coins: rawCoins,
      del_name,
      del_type_identify_id,
      del_identify,
      del_phone,
      del_email,
      authorization_minor,
      email_confirm_inactive_employee,
    } = request.all()

    const photo = request.file('photo')

    const trx = await db.transaction()

    try {
      const business = await Business.findOrFail(businessId)

      // ------------------- BASIC FIELDS -------------------
      business.merge({
        name,
        country_id,
        type_identify_id,
        address,
        phone, identify,
        email,
        authorization_minor,
        email_confirm_inactive_employee,
        days_expire_buget,
        updated_at: dateTime,
        updated_by: userId,
      })

      // ------------------- DELEGATE -------------------
      await trx.from('business_delegates')
        .where('business_id', business.id)
        .delete()

      await business.related('delegate').create(
        {
          name: del_name,
          type_identify_id: del_type_identify_id,
          identify: del_identify,
          phone: del_phone,
          email: del_email,
          created_at: dateTime,
          created_by: userId,
          updated_at: dateTime,
          updated_by: userId,
        },
        { client: trx }
      )

      // ------------------- PHOTO -------------------
      if (photo) {
        // delete old
        if (business.url_short) {
          await Google.deleteFile(business.url_short)
          await Google.deleteFile(business.url_thumb_short!)
        }

        const res = await Google.uploadFile(photo, 'business', 'image')
        business.merge(res)
      }

      await business.useTransaction(trx).save()

      // ------------------- COINS -------------------
      if (rawCoins) {
        const coins: number[] = JSON.parse(rawCoins)

        await trx.from('business_coins')
          .where('business_id', business.id)
          .delete()

        const payload = coins.map((coinId, idx) => ({
          business_id: business.id,
          coin_id: coinId,
          is_default: idx === 0 ? 1 : 0,
        }))

        await business.related('coins').createMany(payload, { client: trx })
      }

      await trx.commit()

      // ------------------- LOAD RELATIONS FOR RESPONSE -------------------
      await business.load('country', (b) => b.select('name as country'))
      await business.load('typeIdentify', (b) => b.select('text as type_identify'))
      await business.load('coins', (b) => b.preload('coins'))

      return response.status(201).json({
        business,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (err) {
      await trx.rollback()
      console.error(err)
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

}