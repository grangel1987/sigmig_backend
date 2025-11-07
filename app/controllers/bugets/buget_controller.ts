import Buget from '#models/bugets/buget'
import Business from '#models/business/business'
import BugetRepository from '#repositories/bugets/buget_repository'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { log } from 'node:console'

export default class BugetController {
  // Create a new buget (legacy parity)
  public async store({ request, response, auth, i18n }: HttpContext) {
    const {
      business_id,
      currency_symbol,
      client,
      products = [],
      items = [],
      banks = [],
      discount = 0,
      utility = 0,
      client_details,
      currency_id,
      currency_value,
    } = request.all()

    const trx = await db.transaction()
    try {
      const dateTime = await Util.getDateTimes(request.ip())
      const business = await Business.query({ client: trx }).where('id', business_id).firstOrFail()
      const daysExpire = business.daysExpireBuget || 0
      const expireDateISO = Util.getDateAddDays(dateTime, daysExpire)
      const expireDate = DateTime.fromISO(expireDateISO)

      // next nro
      const last = await trx.from('bugets').where('business_id', business_id).orderBy('id', 'desc').limit(1)
      const nro = last.length > 0 ? parseInt(String(last[0].nro)) + 1 : 1

      const payload = {
        nro: String(nro),
        businessId: Number(business_id),
        currencySymbol: currency_symbol ?? null,
        currencyId: currency_id ?? null,
        currencyValue: currency_value ?? null,
        clientId: client?.id ?? null,
        discount: Number(discount) || 0,
        utility: Number(utility) || 0,
        createdAt: dateTime,
        updatedAt: dateTime,
        createdBy: auth.user!.id,
        updatedBy: auth.user!.id,
        expireDate,
        enabled: true,
      }

      const buget = await Buget.create(payload, { client: trx })

      // Normalize products to legacy DB columns
      const productsRows = (products as any[]).map((p) => {
        const periodId = p?.period?.period ?? null
        const productId = p?.id_ ?? p?.id
        const countPerson = p?.countPerson
        const amount = p?.amountDefault ?? p?.amount
        return {
          product_id: productId,
          period_id: periodId,
          name: p?.name,
          amount,
          count: p?.count,
          count_person: countPerson,
          tax: p?.tax,
        }
      })

      const itemsRows = (items as any[]).map((it) => ({
        item_id: it?.id,
        with_title: !!it?.with_title,
        title: it?.title ?? null,
        type_id: it?.type_id,
        value: it?.value,
      }))

      const banksRows = (banks as any[]).map((b) => ({ accountId: typeof b === 'object' ? b?.account_id ?? b?.accountId : b }))

      await buget.related('products').createMany(productsRows, { client: trx })
      await buget.related('items').createMany(itemsRows, { client: trx })
      await buget.related('banks').createMany(banksRows, { client: trx })

      if (client_details) {
        const { cost_center, work, observation } = client_details
        if (cost_center || work || observation) {
          await buget.related('details').create({ costCenter: cost_center, work, observation }, { client: trx })
        }
      }

      await trx.commit()

      return response.status(201).json({
        buget,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      await trx.rollback()
      log(error)
      return response.status(500).json(
        MessageFrontEnd(
          i18n.formatMessage('messages.store_error'),
          i18n.formatMessage('messages.error_title')
        )
      )
    }
  }

  // Show details matching legacy shape (expired flag and formatted date)
  public async show({ params, request }: HttpContext) {
    const bugetId = Number(params.id)
    const dateTime = await Util.getDateTimes(request.ip())
    const now = dateTime
    const buget = await Buget.find(bugetId)
    if (!buget) return null

    await buget.load('business', (q) => {
      q.select(['id', 'name', 'url', 'email', 'identify', 'days_expire_buget', 'type_identify_id', 'footer'])
      q.preload('typeIdentify', (qq) => qq.select(['text', 'id']))
    })
    await buget.load('client', (q) => {
      q.select(['id', 'name', 'identify', 'identify_type_id', 'email', 'address', 'city_id', 'phone'])
      q.preload('typeIdentify', (qq) => qq.select(['text', 'id']))
      q.preload('city')
      // q.preload('contact') // optional: enable if needed
    })
    await buget.load('products', (q) => {
      q.preload('products', (qq) => {
        qq.select(['id', 'type_id'])
        qq.preload('type', (qqq) => qqq.select(['id', 'text']))
      })
    })
    await buget.load('items')
    await buget.load('banks', (q) => {
      q.preload('account', (qq) => {
        qq.preload('bank', (qqq) => qqq.select(['id', 'text']))
        qq.preload('typeAccount', (qqq) => qqq.select(['id', 'text']))
        qq.preload('typeIdentify', (qqq) => qqq.select(['id', 'text']))
      })
    })
    await buget.load('details')

    // Compose legacy-like extras
    const serialized: any = buget.serialize()
    const expireDate = buget.expireDate
    if (expireDate) {
      serialized.expired = expireDate >= now ? false : true
      serialized.expire_date_format = Util.parseToMoment(expireDate, false, { separator: '/', firstYear: false })
    } else {
      serialized.expired = true
      serialized.expire_date_format = ''
    }
    return serialized
  }
  // Minimal find by number: returns array with a single record similar to legacy
  public async findByNro({ request }: HttpContext) {
    const { business_id, number } = request.all()
    const rows = await db.from('bugets').where('business_id', business_id).where('nro', number).limit(1)
    const id = rows.length ? rows[0].id : 0
    if (!id) return []
    const buget = await db.from('bugets').where('id', id).first()
    return [buget]
  }

  public async findByNameClient({ request }: HttpContext) {
    const { business_id, name } = request.all()
    return await BugetRepository.findByNameClient(Number(business_id), String(name || ''))
  }

  public async findByDate({ request }: HttpContext) {
    const { business_id, date } = request.all()
    return await BugetRepository.findByDate(Number(business_id), String(date))
  }

  public async delete({ params, request, auth, response, i18n }: HttpContext) {
    const bugetId = Number(params.id)
    const dateTime = await Util.getDateTimes(request.ip())
    try {
      await db
        .from('bugets')
        .where('id', bugetId)
        .update({ enabled: 0, deleted_at: dateTime.toSQL(), deleted_by: auth.user!.id })
      return response.status(201).json(MessageFrontEnd(i18n.formatMessage('messages.delete_ok'), i18n.formatMessage('messages.ok_title')))
    } catch (error) {
      return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.delete_error'), i18n.formatMessage('messages.error_title')))
    }
  }

  public async countMade({ params }: HttpContext) {
    const businessId = Number(params.business_id)
    const query = `
    SELECT 
      COUNT(id) AS counts
    FROM 
      bugets 
    WHERE 
      SUBSTRING(created_at,6,2)=SUBSTRING(CURRENT_DATE(),6,2) AND
      SUBSTRING(created_at,1,4)=SUBSTRING(CURRENT_DATE(),1,4) AND
      bugets.enabled=TRUE AND
      bugets.business_id=${businessId}`
    const result = await db.rawQuery(query)
    const row = (result.rows ?? result[0] ?? [])[0]
    return row?.counts ?? 0
  }

  public async countMadeYear({ params }: HttpContext) {
    const businessId = Number(params.business_id)
    const query = `
      SELECT 
        MonthName(bugets.created_at) AS month, count(*)AS count
      FROM 
        bugets
      WHERE 
        year(bugets.created_at) = year(curdate()) AND
        bugets.enabled=true AND
        bugets.business_id=${businessId}
      GROUP BY MonthName(bugets.created_at)`
    const result = await db.rawQuery(query)
    return result.rows ?? result[0]
  }

  public async report({ request }: HttpContext) {
    const { date_initial, date_end, business_id } = request.all()
    return await BugetRepository.report(String(date_initial), String(date_end), Number(business_id))
  }

  public async searchItems({ request }: HttpContext) {
    const { type_id, category_id, params } = request.all()
    const items = await BugetRepository.searchItems(type_id, category_id, params)
    return (items || []).sort((x: any, y: any) => String(x.value).localeCompare(String(y.value)))
  }

  // Update buget and replace related rows (legacy parity)
  public async update({ params, request, auth, response, i18n }: HttpContext) {
    const bugetId = Number(params.id)
    const trx = await db.transaction()
    try {
      const dateTime = await Util.getDateTimes(request.ip())
      const { products = [], items = [], banks = [], discount, utility, client_details, currency_id, currency_value, currency_symbol } = request.all()

      const buget = await Buget.query({ client: trx }).where('id', bugetId).firstOrFail()

      buget.merge({
        utility: Number(utility) || 0,
        discount: Number(discount) || 0,
        updatedAt: dateTime,
        updatedBy: auth.user!.id,
        currencySymbol: currency_symbol ?? null,
        currencyId: currency_id ?? null,
        currencyValue: currency_value ?? null,
      })
      buget.useTransaction(trx)
      await buget.save()

      // Normalize arrays
      const productsRows = (products as any[]).map((p) => {
        const periodId = p?.period?.period ?? null
        const productId = p?.id_ ?? p?.id
        const countPerson = p?.countPerson
        const amount = p?.amountDefault ?? p?.amount
        return {
          product_id: productId,
          period_id: periodId,
          name: p?.name,
          amount,
          count: p?.count,
          count_person: countPerson,
          tax: p?.tax,
        }
      })

      const itemsRows = (items as any[]).map((it) => ({
        item_id: it?.id,
        with_title: !!it?.with_title,
        title: it?.title ?? null,
        type_id: it?.type_id,
        value: it?.value,
      }))

      const banksRows = (banks as any[]).map((b) => ({ accountId: typeof b === 'object' ? b?.account_id ?? b?.accountId : b }))

      // Clear existing relations
      await trx.from('buget_products').where('buget_id', bugetId).delete()
      await trx.from('buget_accounts').where('buget_id', bugetId).delete()
      await trx.from('buget_items').where('buget_id', bugetId).delete()
      await trx.from('buget_details').where('buget_id', bugetId).delete()

      // Recreate
      await buget.related('products').createMany(productsRows, { client: trx })
      await buget.related('items').createMany(itemsRows, { client: trx })
      await buget.related('banks').createMany(banksRows, { client: trx })

      if (client_details) {
        const { cost_center, work, observation } = client_details
        if (cost_center || work || observation) {
          await buget.related('details').create({ costCenter: cost_center, work, observation }, { client: trx })
        }
      }

      await trx.commit()
      return response.status(201).json({
        buget,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      await trx.rollback()
      return response.status(500).json(
        MessageFrontEnd(
          i18n.formatMessage('messages.udpate_error'),
          i18n.formatMessage('messages.error_title')
        )
      )
    }
  }
}
