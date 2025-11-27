import Product from '#models/products/product'
import ProductRepository from '#repositories/products/product_repository'
import PermissionService from '#services/permission_service'
import { Google } from '#utils/Google'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { productStoreValidator, productUpdateValidator } from '#validators/product'
import { HttpContext } from '@adonisjs/core/http'
import Database from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

type MessageFrontEndType = { message: string; title: string }

export default class ProductController {
  /** Index – list products of the authenticated user’s selected business */
  async index(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'products', 'view')

    const { auth, request, response, i18n } = ctx
    const userId = auth.user!.id
    const { page, perPage, text } = await request.validateUsing(
      vine.compile(
        vine.object({
          page: vine.number().positive().optional(),
          perPage: vine.number().positive().optional(),
          text: vine.string().trim().optional(),
        })
      )
    )

    try {
      const business = await Database.from('business_users')
        .where('selected', true)
        .where('user_id', userId)

        .firstOrFail()

      const query = ProductRepository.index(business.business_id)
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

      if (text?.length) query.whereRaw('name LIKE ?', [`%${text}%`])

      const products = page ? await query.paginate(page, perPage ?? 10) : await query

      return products
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.error_title'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  /** changeStatus – toggle enabled flag */
  async changeStatus(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'products', 'update')

    const { params, response, auth, i18n } = ctx
    const dateTime = DateTime.local()
    try {
      const product = await Product.findOrFail(params.id)
      product.enabled = !product.enabled
      product.updatedById = auth.user!.id
      product.updatedAt = dateTime
      await product.save()

      await product.load('createdBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })
      await product.load('updatedBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })

      return response.status(201).json({
        product,
        ...MessageFrontEnd(
          i18n.formatMessage(product.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.update_error'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  async findAutoComplete(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'products', 'view')

    const { request, response, i18n } = ctx
    const { val, businessId } = await request.validateUsing(
      vine.compile(
        vine.object({
          val: vine.string().trim().minLength(1).optional(),
          businessId: vine.number().positive(),
        })
      )
    )
    try {
      const products = await ProductRepository.findAutoComplete(val, businessId)
      response.ok(products)
    } catch (error) {
      console.error(error)
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.store_error'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  /** Store – create a new product (with optional photo) */
  async store(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'products', 'create')

    const { request, response, auth, i18n } = ctx
    const data = await request.validateUsing(productStoreValidator)
    const photo = request.file('photo')
    const dateTime = DateTime.local()

    try {
      const urls = {
        url: '',
        urlShort: '',
        urlThumb: '',
        urlThumbShort: '',
      }
      if (photo) {
        const res = await Google.uploadFile(photo, 'products')
        Object.assign(urls, res)
      }

      const product = await Product.create({
        ...data,
        ...urls,
        createdById: auth.user!.id,
        updatedById: auth.user!.id,
        createdAt: dateTime,
        updatedAt: dateTime,
      })

      await product.load('createdBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })
      await product.load('updatedBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })

      return response.status(201).json({
        product,
        message: i18n.formatMessage('messages.store_ok'),
        title: i18n.formatMessage('messages.ok_title'),
      } as MessageFrontEndType)
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.store_error'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  /** Show – single product */
  async show(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'products', 'view')

    const { params, response } = ctx
    const product = await Product.findOrFail(params.id)
    await product.load('type')
    response.ok(product)
  }

  /** Delete photo – remove both original & thumbnail from GCS */
  async deletePhoto(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'products', 'update')

    const { params, response, i18n } = ctx
    const product = await Product.findOrFail(params.id)

    const filesToDelete = [product.urlShort, product.urlThumbShort].filter(Boolean) as string[]

    try {
      await Promise.all(filesToDelete.map((f) => Google.deleteFile(f)))

      product.merge({
        url: null,
        urlShort: null,
        urlThumb: null,
        urlThumbShort: null,
      })
      await product.save()

      await product.load('createdBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })
      await product.load('updatedBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })

      return response.status(200).json({
        product,
        message: i18n.formatMessage('messages.ok_delete'),
        title: i18n.formatMessage('messages.ok_title'),
      } as MessageFrontEndType)
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.delete_error'),
            i18n.formatMessage('messages.ok_title')
          )
        )
    }
  }

  /** Update – (you didn’t provide the method body, but here’s a complete version) */
  async update(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'products', 'update')

    const { params, request, response, auth, i18n } = ctx
    const data = await request.validateUsing(productUpdateValidator)
    const photo = request.file('photo', {
      size: '10mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    })

    if (photo && !photo.isValid) {
      return response
        .status(422)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.invalid_image') ||
              'Invalid image or file too large (max 10 MB).',
            i18n.formatMessage('messages.error_title')
          )
        )
    }
    const dateTime = DateTime.local()

    try {
      const product = await Product.findOrFail(params.id)

      let url = product.url
      let urlShort = product.urlShort
      let urlThumb = product.urlThumb
      let urlThumbShort = product.urlThumbShort

      if (photo) {
        const {
          url: newUrl,
          url_short,
          url_thumb,
          url_thumb_short,
        } = await Google.uploadFile(photo, 'products')
        url = newUrl
        urlShort = url_short
        urlThumb = url_thumb
        urlThumbShort = url_thumb_short
      }

      product.merge({
        ...data,
        url,
        urlShort,
        urlThumb,
        urlThumbShort,
        updatedById: auth.user!.id,
        updatedAt: dateTime,
      })
      await product.save()

      await product.load('createdBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })
      await product.load('updatedBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })

      return response.status(200).json({
        product,
        message: i18n.formatMessage('messages.update_ok'),
        title: i18n.formatMessage('messages.ok_title'),
      } as MessageFrontEndType)
    } catch (error) {
      console.error(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.update_error'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }
}
