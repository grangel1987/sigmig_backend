import Product from '#models/products/product'
import ProductRepository from '#repositories/products/product_repository'
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
    async index({ auth, request, response, i18n }: HttpContext) {
        const userId = auth.user!.id
        const { page, perPage } = await request.validateUsing(
            vine.compile(
                vine.object({
                    page: vine.number().positive().optional(),
                    perPage: vine.number().positive().optional(),
                })
            )
        )

        try {
            const business = await Database.from('business_users')
                .where('selected', true)
                .where('user_id', userId)
                .firstOrFail()

            const query = ProductRepository.index(business.business_id)
            const products = page ? await query.paginate(page, perPage ?? 10) : await query

            return products
        } catch (error) {
            console.error(error)
            return response.status(500).json(
                MessageFrontEnd(i18n.formatMessage('messages.error_title'), i18n.formatMessage('messages.error_title'))
            )
        }
    }

    /** Store – create a new product (with optional photo) */
    async store({ request, response, auth, i18n }: HttpContext) {
        const data = await request.validateUsing(productStoreValidator)
        const photo = request.file('photo')
        const dateTime = DateTime.local()

        try {
            const urls = {
                url: '',
                urlShort: '',
                urlThumb: '',
                urlThumbShort: ''
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

            await product.load('createdBy', (b) => b.select('id', 'full_name', 'email'))
            await product.load('updatedBy', (b) => b.select('id', 'full_name', 'email'))

            return response.status(201).json({
                product,
                message: i18n.formatMessage('messages.store_ok'),
                title: i18n.formatMessage('messages.ok_title'),
            } as MessageFrontEndType)
        } catch (error) {
            console.error(error)
            return response.status(500).json(
                MessageFrontEnd(i18n.formatMessage('messages.store_error'), i18n.formatMessage('messages.error_title'))
            )
        }
    }

    /** Show – single product */
    async show({ params, response }: HttpContext) {
        const product = await Product.findOrFail(params.id)
        await product.load('type')
        response.ok(product)
    }

    /** Delete photo – remove both original & thumbnail from GCS */
    async deletePhoto({ params, response, i18n }: HttpContext) {
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

            await product.load('createdBy', (b) => b.select('id', 'full_name', 'email'))
            await product.load('updatedBy', (b) => b.select('id', 'full_name', 'email'))

            return response.status(200).json({
                product,
                message: i18n.formatMessage('messages.ok_delete'),
                title: i18n.formatMessage('messages.ok_title'),
            } as MessageFrontEndType)
        } catch (error) {
            console.error(error)
            return response.status(500).json(
                MessageFrontEnd(i18n.formatMessage('messages.delete_error'), i18n.formatMessage('messages.ok_title'))
            )
        }
    }

    /** Update – (you didn’t provide the method body, but here’s a complete version) */
    async update({ params, request, response, auth, i18n }: HttpContext) {
        const data = await request.validateUsing(productUpdateValidator)
        const photo = request.file('photo')
        const dateTime = DateTime.local()

        try {
            const product = await Product.findOrFail(params.id)

            let url = product.url,
                urlShort = product.urlShort,
                urlThumb = product.urlThumb,
                urlThumbShort = product.urlThumbShort

            if (photo) {
                const { url: newUrl, url_short, url_thumb, url_thumb_short } = await Google.uploadFile(photo, 'products')
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

            await product.load('createdBy', (b) => b.select('id', 'full_name', 'email'))
            await product.load('updatedBy', (b) => b.select('id', 'full_name', 'email'))

            return response.status(200).json({
                product,
                message: i18n.formatMessage('messages.update_ok'),
                title: i18n.formatMessage('messages.ok_title'),
            } as MessageFrontEndType)
        } catch (error) {
            console.error(error)
            return response.status(500).json(
                MessageFrontEnd(i18n.formatMessage('messages.update_error'), i18n.formatMessage('messages.error_title'))
            )
        }
    }
}