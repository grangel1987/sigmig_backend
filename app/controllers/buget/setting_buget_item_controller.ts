import SettingBugetCategory from '#models/buget/setting_buget_category'
import SettingBugetItem from '#models/buget/setting_buget_item'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { searchWithStatusSchema } from '#validators/general'
import { HttpContext } from '@adonisjs/core/http'
import { ModelPaginator } from '@adonisjs/lucid/orm'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import console from 'console'
import { DateTime } from 'luxon'

export default class SettingBugetItemController {
    public async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view');

        const { request, response, i18n } = ctx
        const { page, perPage, text, status } = await request.validateUsing(vine.compile(searchWithStatusSchema)

        )

        try {
            const headerBusinessId = Number(request.header('Business')) || undefined
            const query = SettingBugetItem.query()
                .whereNull('deleted_at')
                .andWhere((q) => {
                    if (headerBusinessId) {
                        q.whereExists(
                            q.client!.from('business_setting_buget_items')
                                .whereColumn('business_setting_buget_items.setting_buget_item_id', 'setting_buget_items.id')
                                .where('business_setting_buget_items.business_id', headerBusinessId)
                        ).orWhereNotExists(
                            q.client!.from('business_setting_buget_items')
                                .whereColumn('business_setting_buget_items.setting_buget_item_id', 'setting_buget_items.id')
                        )
                    } else {
                        q.whereNotExists(
                            q.client!.from('business_setting_buget_items')
                                .whereColumn('business_setting_buget_items.setting_buget_item_id', 'setting_buget_items.id')
                        )
                    }
                })
                .preload('type', (builder) => {
                    builder.select(['id', 'text'])
                })
                .preload('businesses', (builder) => builder.select(['id', 'name']))
                .preload('createdBy', (builder) => {
                    builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })
                .preload('updatedBy', (builder) => {
                    builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })

            if (text) query.where((qb) => {
                const likeVal = `%${text}%`
                qb.whereRaw('value LIKE ?', [likeVal]).orWhereRaw('title LIKE ?', [likeVal])
            })

            const items = await (page ? query.paginate(page, perPage || 10) : query)

            if (status !== undefined) {
                query.where('enabled', status === 'enabled')
            }

            const catsPerItem: Map<number, number[]> = new Map()
            const catIDs = new Set<number>()

            const workingItems = 'all' in items ? items.all() : items

            const serializedItems = await serializeSettingBudgetItemsList(workingItems, catsPerItem, catIDs)

            if (page)
                return { data: serializedItems, meta: (items as ModelPaginator).getMeta() }
            else
                return serializedItems

        } catch (error) {
            console.log(error);

            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            })
        }
    }



    public async store(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'create');

        const { request, response, auth, i18n } = ctx
        const { typeId, value, categoryId: categoryId, withTitle, title, businessId, businessIds } = await request.validateUsing(
            vine.compile(
                vine.object({
                    typeId: vine.number().positive(),
                    value: vine.string().trim(),
                    categoryId: vine.array(vine.number().positive()).optional(),
                    withTitle: vine.boolean().optional(),
                    title: vine.string().trim().optional(),
                    businessId: vine.number().positive().optional(),
                    businessIds: vine.array(vine.number().positive()).optional(),
                })
            )
        )

        const dateTime = DateTime.local()

        const trx = await db.transaction()
        try {
            const categoriesCsv = (categoryId || []).join(',') + ',0'

            const item = await SettingBugetItem.create({
                typeId,
                value,
                withTitle: withTitle ?? false,
                title,
                categoryIdsCsv: categoriesCsv,
                // Only set businessId when provided in payload; otherwise keep null
                businessId: businessId ?? null,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            }, { client: trx })

            if (businessIds?.length) {
                await item.related('businesses').attach(businessIds)
            }

            await trx.commit()

            await item.load((loader) => {
                loader
                    .preload('type', (builder) => builder.select(['id', 'text']))
                    .preload('businesses', (builder) => builder.select(['id', 'name']))
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
            })

            return response.status(201).json({
                item,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_ok'),
                    i18n.formatMessage('messages.ok_title')
                )
            })
        } catch (error) {
            await trx.rollback()
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_error'),
                    i18n.formatMessage('messages.error_title')
                )
            })
        }
    }

    public async update(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'update');

        const { params, request, response, auth, i18n } = ctx
        const itemId = params.id
        const { typeId, value, categoryIds, withTitle, title, businessIds } = await request.validateUsing(
            vine.compile(
                vine.object({
                    typeId: vine.number().positive().optional(),
                    value: vine.string().trim().optional(),
                    categoryIds: vine.array(vine.number().positive()).optional(),
                    withTitle: vine.boolean().optional(),
                    title: vine.string().trim().optional(),
                    businessId: vine.number().positive().optional(),
                    businessIds: vine.array(vine.number().positive()).optional(),
                })
            )
        )

        const dateTime = DateTime.local()

        const trx = await db.transaction()
        try {
            const item = await SettingBugetItem.findOrFail(itemId, { client: trx })
            const categoriesCsv = categoryIds ? categoryIds.join(',') + ',0' : undefined

            item.merge({
                typeId,
                value,
                withTitle,
                title,
                categoryIdsCsv: categoriesCsv,
                // businessId,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await item.useTransaction(trx).save()

            if (businessIds) {
                await item.related('businesses').sync(businessIds)
            }

            await trx.commit()

            await item.load((loader) => {
                loader
                    .preload('type', (builder) => builder.select(['id', 'text']))
                    .preload('businesses', (builder) => builder.select(['id', 'name']))
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
            })

            return response.status(201).json({
                item,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_ok'),
                    i18n.formatMessage('messages.ok_title')
                )
            })
        } catch (error) {
            await trx.rollback()

            console.log(error);

            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            })
        }
    }

    public async changeStatus(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'update');

        const { params, response, auth, i18n } = ctx
        const itemId = params.id
        const dateTime = DateTime.local()

        try {
            const item = await SettingBugetItem.findOrFail(itemId)
            const status = !item.enabled
            item.merge({ enabled: status, updatedById: auth.user!.id, updatedAt: dateTime })
            await item.save()

            // await item.load('type', (builder) => builder.select(['id', 'text']))
            await item.load('createdBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await item.load('updatedBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                item,
                ...MessageFrontEnd(
                    i18n.formatMessage(item.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
                    i18n.formatMessage('messages.ok_title')
                )
            })
        } catch (error) {
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            })
        }
    }

    public async delete(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'delete');

        const { params, response, i18n } = ctx
        const itemId = params.id
        const dateTime = DateTime.local()

        try {
            const item = await SettingBugetItem.findOrFail(itemId)
            item.merge({ deletedAt: dateTime })
            await item.save()

            return response.status(200).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.delete_ok'),
                    i18n.formatMessage('messages.ok_title')
                )
            })
        } catch (error) {
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.delete_error'),
                    i18n.formatMessage('messages.error_title')
                )
            })
        }
    }

    public async findByType(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view');

        const { params, request } = ctx
        const typeId = params.id
        const headerBusinessId = Number(request.header('Business')) || undefined
        const items = await SettingBugetItem.query()
            .select(['id', 'value'])
            .where('type_id', typeId)
            .where('enabled', true)
            .whereNull('deleted_at')
            .andWhere((q) => {
                if (headerBusinessId) {
                    q.whereExists(
                        q.client!.from('business_setting_buget_items')
                            .whereColumn('business_setting_buget_items.setting_buget_item_id', 'setting_buget_items.id')
                            .where('business_setting_buget_items.business_id', headerBusinessId)
                    ).orWhereNotExists(
                        q.client!.from('business_setting_buget_items')
                            .whereColumn('business_setting_buget_items.setting_buget_item_id', 'setting_buget_items.id')
                    )
                } else {
                    q.whereNotExists(
                        q.client!.from('business_setting_buget_items')
                            .whereColumn('business_setting_buget_items.setting_buget_item_id', 'setting_buget_items.id')
                    )
                }
            })
        return items
    }

    public async findAll(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view');

        const { request } = ctx
        const headerBusinessId = Number(request.header('Business')) || undefined
        const items = await SettingBugetItem.query()
            .select(['id', 'type_id', 'value'])
            .where('enabled', true)
            .whereNull('deleted_at')
            .andWhere((q) => {
                if (headerBusinessId) {
                    q.whereExists(
                        q.client!.from('business_setting_buget_items')
                            .whereColumn('business_setting_buget_items.setting_buget_item_id', 'setting_buget_items.id')
                            .where('business_setting_buget_items.business_id', headerBusinessId)
                    ).orWhereNotExists(
                        q.client!.from('business_setting_buget_items')
                            .whereColumn('business_setting_buget_items.setting_buget_item_id', 'setting_buget_items.id')
                    )
                } else {
                    q.whereNotExists(
                        q.client!.from('business_setting_buget_items')
                            .whereColumn('business_setting_buget_items.setting_buget_item_id', 'setting_buget_items.id')
                    )
                }
            })
        return items
    }
}

async function serializeSettingBudgetItemsList(workingItems: SettingBugetItem[], catsPerItem: Map<number, number[]>, catIDs: Set<number>) {
    for (let i = 0; i < workingItems.length; i++) {
        const item = workingItems[i]
        const categoryIdsCsv = item.categoryIdsCsv

        if (!categoryIdsCsv) continue
        const cats = categoryIdsCsv.split(',').map(idStr => parseInt(idStr, 10)).filter(id => !isNaN(id) && id !== 0)
        catsPerItem.set(item.id, cats)

        cats.forEach(catId => {
            catIDs.add(catId)
        })
    }
    const categories = catIDs.size ? await SettingBugetCategory.query()
        .select('id', 'name')
        .whereIn('id', Array.from(catIDs)) : []

    const serializedItems = workingItems.map(item => {
        const itemJson = item.toJSON()
        const cats = catsPerItem.get(item.id) || []
        itemJson.categories = categories.filter(cat => cats.includes(cat.id))
        delete itemJson.categoryIdsCsv
        return itemJson
    })
    return serializedItems
}
