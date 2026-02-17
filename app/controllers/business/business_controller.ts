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
    const dateTime = await Util.getDateTimes(request)

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
      delegateName,
      delegateTypeIdentifyId,
      delegateIdentify,
      delegatePhone,
      delegateEmail,
      authorizationMinor,
      emailConfirmInactiveEmployee,
    } = await request.validateUsing(businessValidator)

    const photo = request.file('photo', { size: '2mb', extnames: ['jpg', 'png', 'jpeg', 'webp',] })

    if (!photo) {
      const trx = await db.transaction()
      try {
        const payload: BusinessPayload = {
          countryId,
          typeIdentifyId,
          identify,
          name,
          address,
          phone,
          email,
          authorizationMinor: Boolean(authorizationMinor),
          daysExpireBuget: daysExpireBuget,
          createdAt: dateTime,
          createdById: auth.user!.id,
          updatedAt: dateTime,
          updatedById: auth.user!.id,
          emailConfirmInactiveEmployee: Boolean(emailConfirmInactiveEmployee),
        }

        const delegatePayload = {
          name: delegateName,
          type_identify_id: delegateTypeIdentifyId,
          identify: delegateIdentify,
          phone: delegatePhone,
          email: delegateEmail,
        }

        const business = await Business.create(payload, { client: trx })

        await business.related('delegate').create(delegatePayload, { client: trx })

        if (photo) {
          const res = await Google.uploadFile(photo, 'business', 'image')

          await business.merge(res).useTransaction(trx).save()

          if (coins) {

            await trx.from('business_coins').where('business_id', business.id).delete()

            const coinsData = coins.map((coinId: number, index: number) => ({
              businessId: business.id,
              coinId: coinId,
              isDefault: index === 0 ? 1 : 0,
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
  }


  /** -----------------------------------------------------------------
   *  FIND ALL BUSINESSES FOR LOGGED USER + COINS + TAXES
   *  ----------------------------------------------------------------- */
  public async findBusinessByUser(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'business', 'view')

    const { request, auth } = ctx
    const authUser = auth.getUserOrFail()
    const userId = authUser.id

    const { page, perPage } = await request.validateUsing(vine.compile(vine.object({
      page: vine.number().positive().optional(),
      perPage: vine.number().positive().optional()
    })))

    const activeBizUser = await authUser.related('selectedBusiness').query().first()

    const businesses = await BusinessRepository.findBusinessByUser(userId, page, perPage)
    const businessCoins = await BusinessRepository.findBusinessCoins(userId)
    const businessTaxes = await BusinessRepository.findBusinessTaxes(userId)
    const res = businesses.all().map((business) => {
      const bid = business.id
      const serBiz = business.serialize()
      serBiz.coins = businessCoins.filter((c) => c.business_id === bid)
      serBiz.taxes = businessTaxes
        .filter((t) => t.business_id === bid)
      serBiz.selected = activeBizUser?.businessId === bid
      return serBiz
    }
    )

    return { data: res, meta: businesses.getMeta() }
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
  public async show({ params, response, i18n }: HttpContext) {
    try {
      const business = await Business.findOrFail(params.id)

      if (!business.enabled) {
        return response.status(422).json({
          ...MessageFrontEnd(
            i18n.formatMessage('data.not_found'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      // Load relationships
      await business.load('country')
      await business.load('typeIdentify')
      await business.load('delegate')
      await business.load('city')
      await business.load('coins', (builder) => {
        builder.preload('coins')
      })

      return business
    } catch (error) {
      return response.status(422).json({
        ...MessageFrontEnd(
          i18n.formatMessage('data.not_found'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
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

    await business.load('country')
    await business.load('typeIdentify')
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
    const dateTime = await Util.getDateTimes(request)

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
      delegateName,
      delegateTypeIdentifyId,
      delegateIdentify,
      delegatePhone,
      delegateEmail,
      authorizationMinor,
      emailConfirmInactiveEmployee,
    } = await request.validateUsing(businessValidator)

    const photo = request.file('photo')

    const trx = await db.transaction()

    try {
      const business = await Business.findOrFail(businessId, { client: trx })

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

      if (delegateName || delegateEmail) {
        const delegate = await business.useTransaction(trx).related('delegate').query().first()
        if (!delegate) {
          await business.related('delegate').create(
            {
              name: delegateName,
              typeIdentifyId: delegateTypeIdentifyId,
              identify: delegateIdentify,
              phone: delegatePhone,
              email: delegateEmail,
              createdAt: dateTime,
              createdBy: userId,
              updatedAt: dateTime,
              updatedBy: userId,
            },
            { client: trx }
          )
        }
        else {
          await delegate.useTransaction(trx).merge({
            name: delegateName,
            typeIdentifyId: delegateTypeIdentifyId,
            identify: delegateIdentify,
            phone: delegatePhone,
            email: delegateEmail,
            updatedAt: dateTime,
            updatedBy: userId,
          }).save()
        }
      }
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
      if (coins) {

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
      await business.load('country')
      await business.load('typeIdentify')
      await business.load('coins', (b) => b.preload('coins'))
      await business.load('delegate')

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