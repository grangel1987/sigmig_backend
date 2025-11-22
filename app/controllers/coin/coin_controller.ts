import Coin from '#models/coin/coin'
import CoinRepository from '#repositories/coin/coin_repository'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

export default class CoinController {
    /** List coins (optional pagination) */
    public async index({ request }: HttpContext) {
        const { page, perPage } = await request.validateUsing(
            vine.compile(
                vine.object({
                    page: vine.number().positive().optional(),
                    perPage: vine.number().positive().optional(),
                })
            )
        )

        const query = Coin.query()
            .preload('createdBy', (b) => {
                b.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })
            .preload('updatedBy', (b) => {
                b.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })

        return page ? query.paginate(page, perPage ?? 10) : query
    }

    /** Create coin */
    public async store({ request, response, auth, i18n }: HttpContext) {
        const { name, symbol } = await request.validateUsing(
            vine.compile(
                vine.object({
                    name: vine.string().trim(),
                    symbol: vine.string().trim(),
                })
            )
        )

        const dateTime = DateTime.local()

        try {
            const coin = await Coin.create({
                name,
                symbol,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            })
            await coin.load('createdBy', (b) => {
                b.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })
            await coin.load('updatedBy', (b) => {
                b.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                coin,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_ok'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.store_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }

    /** Update coin */
    public async update({ params, request, response, auth, i18n }: HttpContext) {
        const { name, symbol } = await request.validateUsing(
            vine.compile(
                vine.object({
                    name: vine.string().trim().optional(),
                    symbol: vine.string().trim().optional(),
                })
            )
        )

        const dateTime = DateTime.local()

        try {
            const coin = await Coin.findOrFail(params.id)
            coin.merge({ name, symbol, updatedById: auth.user!.id, updatedAt: dateTime })
            await coin.save()

            await coin.load('createdBy', (b) => {
                b.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })
            await coin.load('updatedBy', (b) => {
                b.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                coin,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_ok'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }

    /** Select list */
    public async select() {
        return CoinRepository.select()
    }

    /** Change status (toggle enabled) */
    public async changeStatus({ params, response, auth, i18n }: HttpContext) {
        const dateTime = DateTime.local()

        try {
            const coin = await Coin.findOrFail(params.id)
            coin.enabled = !coin.enabled
            coin.updatedById = auth.user!.id
            coin.updatedAt = dateTime
            await coin.save()

            await coin.load('createdBy', (b) => {
                b.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })
            await coin.load('updatedBy', (b) => {
                b.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })

            return response.status(200).json({
                coin,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_ok'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }
}
