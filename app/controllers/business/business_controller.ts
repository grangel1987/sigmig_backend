import Business from '#models/business/business'
import BusinessRepository from '#repositories/business/business_repository'
import PermissionService from '#services/permission_service'
import { Google } from '#utils/Google'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import { businessValidator } from '#validators/business'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

interface BusinessPayload {
  countryId: number
  typeIdentifyId: number
  identify: string
  name: string
  address: string
  phone: string
  email: string
  authorizationMinor: boolean
  daysExpireBuget: number
  createdAt: DateTime
  createdById: number
  updatedAt: DateTime
  updatedById: number
  emailConfirmInactiveEmployee: boolean
}

export default class BusinessController {
  public async store(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'business', 'create')

    const { request, response, auth, i18n } = ctx
    const trx = await db.transaction()
    const dateTime = await Util.getDateTimes(request.ip())

    const {
      name,
      countryId,
      typeIdentifyId,
      identify,
      address,
      phone,
      email,
      daysExpireBuget,
      coins,
      delName,
      delTypeIdentifyId,
      delIdentify,
      delPhone,
      delEmail,
      authorizationMinor,
      emailConfirmInactiveEmployee,
    } = await request.validateUsing(businessValidator)

    const photo = request.file('photo', { size: '2mb', extnames: ['jpg', 'png', 'jpeg', 'webp',] })

    if (!photo)

      try {
        const payload: BusinessPayload = {
          countryId,
          typeIdentifyId,
          identify,
          name,
          address,
          phone,
          email,
          authorizationMinor: authorizationMinor === 'true',
          daysExpireBuget: daysExpireBuget,
          createdAt: dateTime,
          createdById: auth.user!.id,
          updatedAt: dateTime,
          updatedById: auth.user!.id,
          emailConfirmInactiveEmployee: emailConfirmInactiveEmployee === 'true',
        }

        const delegatePayload = {
          name: delName,
          type_identify_id: delTypeIdentifyId,
          identify: delIdentify,
          phone: delPhone,
          email: delEmail,
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
  public async findBusinessByUser(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'business', 'view')

    const { request, auth } = ctx
    const userId = auth.user!.id

    const { page, perPage } = await request.validateUsing(vine.compile(vine.object({
      page: vine.number().positive().optional(),
      perPage: vine.number().positive().optional()
    })))

    const businesses = await BusinessRepository.findBusinessByUser(userId, page, perPage)
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
  public async changeBusiness(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'business', 'update')

    const { params, auth, response, i18n } = ctx
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
  public async show(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'business', 'view')

    const { params, response, i18n } = ctx
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
  public async deletePhoto(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'business', 'update')

    const { params, response, i18n } = ctx
    const business = await Business.findOrFail(params.id)
    const { urlShort, urlThumbShort } = business

    if (urlShort) {
      try {
        await Google.deleteFile(urlShort)
        await Google.deleteFile(urlThumbShort!)

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
    business.urlShort = ''
    business.urlThumb = ''
    business.urlThumbShort = ''
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
  public async update(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'business', 'update')

    const { params, request, response, auth, i18n } = ctx
    const businessId = Number(params.id)
    const userId = auth.user!.id
    const ip = request.ip()
    const dateTime = await Util.getDateTimes(ip)

    const {
      name,
      country_id: countryId,
      type_identify_id: typeIdentifyId,
      identify,
      address,
      phone,
      email,
      days_expire_buget: daysExpireBuget,
      coins: rawCoins,
      del_name: delName,
      del_type_identify_id: delTypeIdentifyId,
      del_identify: delIdentify,
      del_phone: delPhone,
      del_email: delEmail,
      authorization_minor: authorizationMinor,
      email_confirm_inactive_employee: emailConfirmInactiveEmployee,
    } = request.all()

    const photo = request.file('photo')

    const trx = await db.transaction()

    try {
      const business = await Business.findOrFail(businessId)

      // ------------------- BASIC FIELDS -------------------
      business.merge({
        name,
        countryId,
        typeIdentifyId,
        address,
        phone, identify,
        email,
        authorizationMinor,
        emailConfirmInactiveEmployee,
        daysExpireBuget,
        updatedAt: dateTime,
        updatedById: userId,
      })

      // ------------------- DELEGATE -------------------
      await trx.from('business_delegates')
        .where('business_id', business.id)
        .delete()

      if (delName || delEmail)
        await business.related('delegate').create(
          {
            name: delName,
            typeIdentifyId: delTypeIdentifyId,
            identify: delIdentify,
            phone: delPhone,
            email: delEmail,
            createdAt: dateTime,
            createdBy: userId,
            updatedAt: dateTime,
            updatedBy: userId,
          },
          { client: trx }
        )

      // ------------------- PHOTO -------------------
      if (photo) {
        // delete old
        if (business.urlShort) {
          await Google.deleteFile(business.urlShort)
          await Google.deleteFile(business.urlThumbShort!)
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
          businessId: business.id,
          coinId: coinId,
          isDefault: idx === 0 ? 1 : 0,
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