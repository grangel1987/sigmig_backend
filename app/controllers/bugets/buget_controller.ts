import Buget from '#models/bugets/buget'
import Business from '#models/business/business'
import BusinessUser from '#models/business/business_user'
import BugetRepository from '#repositories/bugets/buget_repository'
import PermissionService from '#services/permission_service'
import env from '#start/env'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import { bugetFindByDateValidator, bugetFindByNameClientValidator, bugetFindByNroValidator, bugetStoreValidator, bugetUpdateValidator } from '#validators/buget'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import { log } from 'node:console'

export default class BugetController {


  public async store(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'bugets', 'create')

    const { request, response, auth, i18n } = ctx
    // Expect camelCase input keys only
    const {
      businessId,
      currencySymbol,
      currencyId,
      currencyValue,
      clientDetails,
      client,
      products = [],
      items = [],
      banks = [],
      discount = 0,
      utility = 0,
    } = await request.validateUsing(bugetStoreValidator)

    const trx = await db.transaction()
    try {
      const dateTime = await Util.getDateTimes(request)
      const business = await Business.query({ client: trx }).where('id', businessId).firstOrFail()
      const daysExpire = business.daysExpireBuget || 0
      const expireDateISO = Util.getDateAddDays(dateTime, daysExpire)
      const expireDate = DateTime.fromISO(expireDateISO)

      // next nro
      const last = await trx.from('bugets')
        .where('business_id', businessId)
        .orderBy('id', 'desc')
        .limit(1)

      const nro = last.length > 0 ? parseInt(String(last[0].nro)) + 1 : 1

      const payload = {
        nro: String(nro),
        businessId: Number(businessId),
        currencySymbol: currencySymbol ?? null,
        currencyId: currencyId ?? null,
        currencyValue: currencyValue ?? null,
        clientId: client?.id ?? null,
        discount: Number(discount) || 0,
        utility: Number(utility) || 0,
        createdAt: dateTime,
        updatedAt: dateTime,
        createdById: auth.user!.id,
        updatedById: auth.user!.id,
        expireDate,
        enabled: true,
      }

      const buget = await Buget.create(payload, { client: trx })

      // Normalize products to model properties (camelCase)
      const productsRows = (products as any[]).map((p) => {
        const periodId = p?.period?.period ?? null
        const productId = p?.id
        const countPerson = p?.countPerson
        const amount = p?.amountDefault ?? p?.amount
        return {
          productId: productId,
          periodId: periodId,
          name: p?.name,
          amount,
          count: p?.count,
          countPerson: countPerson,
          tax: p?.tax,
        }
      })

      const itemsRows = (items as any[]).map((it) => ({
        itemId: it?.id,
        withTitle: !!it?.withTitle,
        title: it?.title ?? null,
        typeId: it?.typeId,
        value: it?.value,
      }))

      const banksRows = (banks as any[]).map((b) => ({ accountId: typeof b === 'object' ? b?.accountId : b }))

      await buget.related('products').createMany(productsRows, { client: trx })
      await buget.related('items').createMany(itemsRows, { client: trx })
      await buget.related('banks').createMany(banksRows, { client: trx })

      if (clientDetails) {
        const { costCenter, work, observation } = clientDetails as any
        if (costCenter || work || observation) {
          await buget.related('details').create({ costCenter, work, observation }, { client: trx })
        }
      }

      await trx.commit()

      await buget.load('createdBy', (builder) => {
        builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      await buget.load('updatedBy', (builder) => {
        builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })

      // Load client data for email
      await buget.load('client', (q) => q.select(['name']))

      // Prepare email payload data
      const clientName = buget.client?.name || ''
      const createdByName = buget.createdBy?.personalData ? `${buget.createdBy.personalData.names} ${buget.createdBy.personalData.lastNameP} ${buget.createdBy.personalData.lastNameM}`.trim() : ''
      /*       const host = env.get('NODE_ENV') === 'development'
              ? 'http://212.38.95.163/sigmig/'
              : 'https://admin.serviciosgenessis.com/'
            const budgetUrl = host + `admin/budget/${buget.id}`
       */

      // Send email notification to super users
      try {
        await sendBudgetNotification(businessId, {
          budgetNumber: buget.nro,
          clientName,
          expirationDate: buget.expireDate ? buget.expireDate.toFormat('yyyy/LL/dd') : '---',
          createdBy: createdByName,
          // budgetUrl,
          businessName: business.name,
          subject: i18n.formatMessage('messages.budget_created_email_subject', { budgetNumber: buget.nro }),
          body: i18n.formatMessage('messages.budget_created_email_body', {
            budgetNumber: buget.nro,
            clientName,
            expirationDate: buget.expireDate ? buget.expireDate.toFormat('yyyy/LL/dd') : '---',
            createdBy: createdByName
          }),
          budgetNumberLabel: i18n.formatMessage('messages.budget_number'),
          clientLabel: i18n.formatMessage('messages.client'),
          expirationDateLabel: i18n.formatMessage('messages.expiration_date'),
          createdByLabel: i18n.formatMessage('messages.created_by'),
          viewBudgetLabel: i18n.formatMessage('messages.view_budget'),
          backupText: i18n.formatMessage('messages.budget_created_backup_text'),
        })
      } catch (emailError) {
        // Log email error but don't fail the budget creation
        console.log('Error sending budget creation notification email:', emailError)
      }

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

  // List budgets with optional pagination and filtering
  public async index(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'bugets', 'view')

    const { request } = ctx
    const { businessId, page = 1, limit = 20, enabled } = request.qs()

    let query = Buget.query()
      .preload('client', q =>
        q.preload('city')
          .preload('typeIdentify')
      )
      .preload('createdBy', (builder) => {
        builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      .preload('updatedBy', (builder) => {
        builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      .orderBy('created_at', 'desc')

    if (businessId) {
      query = query.where('business_id', businessId)
    }

    if (enabled !== undefined) {
      query = query.where('enabled', enabled === 'true')
    }

    const budgets = await query.paginate(page, limit)

    return budgets
  }

  // Show details matching legacy shape (expired flag and formatted date)
  public async show(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'bugets', 'view')

    const { params, request } = ctx
    const bugetId = Number(params.id)
    const dateTime = await Util.getDateTimes(request)
    const now = dateTime
    const buget = await Buget.find(bugetId)
    if (!buget) return null


    await buget.load('createdBy', (builder) => {
      builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
    })
    await buget.load('updatedBy', (builder) => {
      builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
    })

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

  // Public method to view budget by token (no authentication required)
  public async showPublic(ctx: HttpContext) {
    const { params, request } = ctx
    const token = params.token as string

    if (!token) {
      return ctx.response.status(400).json({
        message: 'Token is required',
        title: 'Bad Request'
      })
    }

    const dateTime = await Util.getDateTimes(request)
    const now = dateTime

    // Find budget by token (bypassing the enabled filter)
    const buget = await Buget.query()
      .where('token', token)
      .where('enabled', true)
      .first()

    if (!buget) {
      return ctx.response.status(404).json({
        message: 'Budget not found or expired',
        title: 'Not Found'
      })
    }

    // Load all the same relationships as the authenticated show method
    await buget.load('business', (q) => {
      q.select(['name', 'url', 'email', 'identify', 'footer', 'type_identify_id'])
      q.preload('typeIdentify', (qq) => qq.select(['text']))
    })

    await buget.load('client', (q) => {
      q.select(['name', 'identify', 'email', 'address', 'phone', 'identify_type_id', 'city_id'])
      q.preload('typeIdentify', (qq) => qq.select(['text']))
      q.preload('city', (qq) => qq.select(['name']))
    })

    await buget.load('products', (q) => {
      q.select(['name', 'amount', 'count', 'count_person', 'tax', 'product_id'])
      q.preload('products', (qq) => {
        qq.select(['name', 'type_id'])
        qq.preload('type', (qqq) => qqq.select(['text']))
      })
    })

    await buget.load('items', (q) => {
      q.select(['with_title', 'title', 'value'])
    })

    await buget.load('banks', (q) => {
      q.select(['account_id'])
      q.preload('account', (qq) => {
        qq.select(['number', 'bank_id', 'type_account_id'])
        qq.preload('bank', (qqq) => qqq.select(['text']))
        qq.preload('typeAccount', (qqq) => qqq.select(['text']))
      })
    })

    await buget.load('details', (q) => {
      q.select(['cost_center', 'work', 'observation'])
    })

    // Create a clean serialized version without IDs and timestamps
    const serialized: any = {
      nro: buget.nro,
      currencySymbol: buget.currencySymbol,
      currencyValue: buget.currencyValue,
      utility: buget.utility,
      discount: buget.discount,
      enabled: !!buget.enabled, // Ensure boolean
      expireDate: buget.expireDate?.toFormat('dd/MM/yyyy'),
      business: buget.business ? {
        name: buget.business.name,
        url: buget.business.url,
        email: buget.business.email,
        identify: buget.business.identify,
        footer: buget.business.footer,
        typeIdentify: buget.business.typeIdentify?.text
      } : null,
      client: buget.client ? {
        name: buget.client.name,
        identify: buget.client.identify,
        email: buget.client.email,
        address: buget.client.address,
        phone: buget.client.phone,
        typeIdentify: buget.client.typeIdentify?.text,
        city: buget.client.city?.name
      } : null,
      products: buget.products?.map(product => ({
        name: product.name,
        amount: product.amount,
        count: product.count,
        countPerson: product.countPerson,
        tax: product.tax,
        product: product.products ? {
          name: product.products.name,
          type: product.products.type?.text
        } : null
      })) || [],
      items: buget.items?.map(item => ({
        withTitle: !!item.withTitle, // Ensure boolean
        title: item.title,
        value: item.value
      })) || [],
      banks: buget.banks?.filter(bank => bank.account).map(bank => ({
        account: {
          accountNumber: bank.account!.number,
          bank: bank.account!.bank?.text,
          typeAccount: bank.account!.typeAccount?.text
        }
      })) || [],
      details: buget.details ? {
        costCenter: buget.details.costCenter,
        work: buget.details.work,
        observation: buget.details.observation
      } : null
    }

    // Add expiration info
    const expireDate = buget.expireDate
    if (expireDate) {
      serialized.expired = expireDate < now
      serialized.expireDateFormat = Util.parseToMoment(expireDate, false, { separator: '/', firstYear: false })
    } else {
      serialized.expired = true
      serialized.expireDateFormat = ''
    }

    return serialized
  }

  // Minimal find by number: returns array with a single record similar to legacy
  public async findByNro(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'bugets', 'view')

    const { request } = ctx
    const { businessId, number } = await request.validateUsing(bugetFindByNroValidator)
    const budgetRes = await Buget.query().where('business_id', businessId)
      .preload('client', q =>
        q.preload('city')
          .preload('typeIdentify')
      )
      .where('nro', number)
      // .where('enabled', true)
      .orderBy('id', 'desc')
      .first()
    return [budgetRes]
  }

  public async findByNameClient(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'bugets', 'view')

    const { request } = ctx
    const { businessId, name, page, perPage } = await request.validateUsing(bugetFindByNameClientValidator)
    return await BugetRepository.findByNameClient(Number(businessId), String(name || ''), page, perPage)
  }

  public async findByDate(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'bugets', 'view')

    const { request } = ctx
    const { businessId, date, page, perPage } = await request.validateUsing(bugetFindByDateValidator)
    const dateSql = DateTime.fromJSDate(date).toSQLDate()!

    return await BugetRepository.findByDate(Number(businessId), String(dateSql), page, perPage)
  }

  public async delete(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'bugets', 'delete')

    const { params, request, auth, response, i18n } = ctx
    const bugetId = Number(params.id)
    const dateTime = await Util.getDateTimes(request)
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

  public async countMade(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'bugets', 'view')

    const { params } = ctx
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

  public async countMadeYear(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'bugets', 'view')

    const { params } = ctx
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

  public async report(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'bugets', 'viewReports')

    const { request } = ctx
    const { dateInitial, dateEnd, businessId, page = 1, limit = 20 } = await request.validateUsing(vine.compile(vine.object({
      dateInitial: vine.date().optional(),
      dateEnd: vine.date().optional(),
      businessId: vine.number(),
      page: vine.number().optional(),
      limit: vine.number().optional(),
    })))

    return await BugetRepository.report(businessId, dateInitial, dateEnd, page, limit)
  }

  public async searchItems(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'bugets', 'view')

    const { request } = ctx
    const { typeId, categoryId, params } = request.all()
    const items = await BugetRepository.searchItems(typeId, categoryId, params)
    return (items || []).sort((x: any, y: any) => String(x.value).localeCompare(String(y.value)))
  }

  // Update buget and replace related rows (legacy parity)
  public async update(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'bugets', 'update')

    const { params, request, auth, response, i18n } = ctx
    const bugetId = Number(params.id)
    const trx = await db.transaction()
    try {
      const dateTime = await Util.getDateTimes(request)
      const {
        products = [],
        items = [],
        banks = [],
        discount,
        utility,
        clientDetails,
        currencyId,
        currencyValue,
        currencySymbol,
        keepSameNro = false,
      } = await request.validateUsing(bugetUpdateValidator)

      const existingBuget = await Buget.query({ client: trx })
        .where('id', bugetId)
        .where('enabled', true) // Only update enabled budgets
        .forUpdate() // Lock the row to prevent concurrent updates
        .firstOrFail()

      const token = existingBuget.token!

      await trx.from('bugets')
        .where('id', bugetId)
        .update({
          enabled: 0,
          token: null,
          updated_at: dateTime.toSQL({ includeOffset: false }),
          updated_by: auth.user!.id,
        })

      // Get business for expiration calculation
      const business = await Business.query({ client: trx }).where('id', existingBuget.businessId!).firstOrFail()
      const daysExpire = business.daysExpireBuget || 0
      const expireDateISO = Util.getDateAddDays(dateTime, daysExpire)
      const expireDate = DateTime.fromISO(expireDateISO)

      // Get next nro or keep the same one
      let nro: string
      if (keepSameNro) {
        nro = existingBuget.nro!
      } else {
        const last = await trx.from('bugets').where('business_id', existingBuget.businessId!).orderBy('id', 'desc').limit(1)
        nro = String(last.length > 0 ? parseInt(String(last[0].nro)) + 1 : 1)
      }

      // Create new budget payload!

      const buget = await Buget.create({
        nro: String(nro),
        businessId: existingBuget.businessId,
        currencySymbol: currencySymbol ?? null,
        currencyId: currencyId ?? null,
        currencyValue: currencyValue ?? null,
        clientId: existingBuget.clientId,
        discount: Number(discount) || 0,
        utility: Number(utility) || 0,
        createdAt: dateTime,
        prevId: existingBuget.id,
        token,
        updatedAt: dateTime,
        createdById: auth.user!.id,
        updatedById: auth.user!.id,
        expireDate,
        enabled: true,
      }, { client: trx })

      // Normalize products to model properties (camelCase)
      const productsRows = (products as any[]).map((p) => {
        const periodId = p?.period?.period ?? null
        const productId = p?.id
        const countPerson = p?.countPerson
        const amount = p?.amountDefault ?? p?.amount
        return {
          productId: productId,
          periodId: periodId,
          name: p?.name,
          amount,
          count: p?.count,
          countPerson: countPerson,
          tax: p?.tax,
        }
      })

      const itemsRows = (items as any[]).map((it) => ({
        itemId: it?.id,
        withTitle: !!it?.withTitle,
        title: it?.title ?? null,
        typeId: it?.typeId,
        value: it?.value,
      }))

      const banksRows = (banks as any[]).map((b) => ({ accountId: typeof b === 'object' ? b?.accountId : b }))

      await buget.related('products').createMany(productsRows, { client: trx })
      await buget.related('items').createMany(itemsRows, { client: trx })
      await buget.related('banks').createMany(banksRows, { client: trx })

      if (clientDetails) {
        const { costCenter, work, observation } = clientDetails as any
        if (costCenter || work || observation) {
          await buget.related('details').create({ costCenter, work, observation }, { client: trx })
        }
      }

      await trx.commit()

      await buget.load('createdBy', (builder) => {
        builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })
      await buget.load('updatedBy', (builder) => {
        builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
      })

      // Load client data for email
      await buget.load('client', (q) => q.select(['name']))

      // Prepare email payload data for budget update
      const clientName = buget.client?.name || ''
      const updatedByName = buget.updatedBy?.personalData ? `${buget.updatedBy.personalData.names} ${buget.updatedBy.personalData.lastNameP} ${buget.updatedBy.personalData.lastNameM}`.trim() : ''
      /*       const host = env.get('NODE_ENV') === 'development'
              ? 'http://212.38.95.163/sigmig/'
              : 'https://admin.serviciosgenessis.com/'
            const budgetUrl = host + `admin/budget/${buget.id}` */

      const subject = i18n.formatMessage('messages.budget_updated_email_subject', { budgetNumber: buget.nro })
      const body = i18n.formatMessage('messages.budget_updated_email_body', {
        budgetNumber: buget.nro,
        clientName,
        expirationDate: buget.expireDate ? buget.expireDate.toFormat('yyyy/LL/dd') : '---',
        createdBy: updatedByName
      })
      const budgetNumberLabel = i18n.formatMessage('messages.budget_number')
      const clientLabel = i18n.formatMessage('messages.client')
      const expirationDateLabel = i18n.formatMessage('messages.expiration_date')
      const createdByLabel = i18n.formatMessage('messages.updated_by')
      const viewBudgetLabel = i18n.formatMessage('messages.view_budget')
      const backupText = i18n.formatMessage('messages.budget_updated_backup_text')

      // Send email notification to super users
      try {
        await sendBudgetNotification(business.id, {
          subject,
          body,
          budgetNumber: buget.nro,
          clientName,
          expirationDate: buget.expireDate ? buget.expireDate.toFormat('yyyy/LL/dd') : '---',
          createdBy: updatedByName,
          // budgetUrl,
          businessName: business.name,
          budgetNumberLabel,
          clientLabel,
          expirationDateLabel,
          createdByLabel,
          viewBudgetLabel,
          backupText,
        }, 'emails/budget_updated')
      } catch (emailError) {
        // Log email error but don't fail the budget update
        console.log('Error sending budget update notification email:', emailError)
      }

      return response.status(201).json({
        buget,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      await trx.rollback()

      console.log(error);

      return response.status(500).json(
        MessageFrontEnd(
          i18n.formatMessage('messages.update_error'),
          i18n.formatMessage('messages.error_title')
        )
      )
    }
  }

  public async sendEmailToClient(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'bugets', 'view')

    const { params, response, i18n } = ctx
    const bugetId = Number(params.id)
    const { email } = await ctx.request.validateUsing(
      vine.compile(
        vine.object({
          email: vine.string().email().optional(),
        })
      )
    )

    try {
      const buget = await Buget.find(bugetId)
      if (!buget) {

        console.log(bugetId);

        return response.status(404).json(
          MessageFrontEnd(
            i18n.formatMessage('messages.no_exist'),
            i18n.formatMessage('messages.error_title')
          )
        )
      }

      await buget.load('client', (q) => {
        q.select(['id', 'name', 'email'])
      })
      await buget.load('business', (q) => {
        q.select(['id', 'name', 'url'])
      })

      if (!buget.client || (!email && !buget.client?.email)) {

        console.log('Email values:', { email, clientEmail: buget.client.email });

        return response.status(400).json(
          MessageFrontEnd(
            i18n.formatMessage('messages.no_exist'),
            i18n.formatMessage('messages.error_title')
          )
        )
      }

      const recipientEmail = email || buget.client.email!

      const clientName = buget.client.name
      const budgetNumber = buget.nro
      const expirationDate = buget.expireDate ? Util.parseToMoment(buget.expireDate, false, { separator: '/', firstYear: false }) : ''
      const businessName = buget.business?.name || ''

      const host = env.get('NODE_ENV') === 'development'
        ? 'http://212.38.95.163/sigmig/'
        : 'https://admin.serviciosgenessis.com/'

      const budgetUrl = host + `client/budget/${buget.token}`

      const subject = i18n.formatMessage('messages.budget_email_subject')
      const body = i18n.formatMessage('messages.budget_email_body', { clientName, budgetNumber, expirationDate, businessName })
      const budgetNumberLabel = i18n.formatMessage('messages.budget_number')
      const expirationDateLabel = i18n.formatMessage('messages.expiration_date')
      const businessLabel = i18n.formatMessage('messages.business')
      const viewBudgetLabel = i18n.formatMessage('messages.view_budget')

      await mail.sendLater((message) => {
        message
          .to(recipientEmail)
          .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
          .subject(subject)
          .htmlView('emails/budget_client', {
            subject,
            body,
            budgetNumber,
            expirationDate,
            budgetUrl: budgetUrl,
            businessName,
            budgetNumberLabel,
            expirationDateLabel,
            businessLabel,
            viewBudgetLabel,
          })
      })

      return response.status(200).json(
        MessageFrontEnd(
          i18n.formatMessage('messages.email_send_ok'),
          i18n.formatMessage('messages.ok_title')
        )
      )
    } catch (error) {
      log(error)
      return response.status(500).json(
        MessageFrontEnd(
          i18n.formatMessage('messages.email_send_error'),
          i18n.formatMessage('messages.error_title')
        )
      )
    }
  }
}


export async function sendBudgetNotification(businessId: number, emailData: {
  subject: string
  body: string
  budgetNumber: string
  clientName: string
  expirationDate: string
  createdBy: string
  budgetUrl?: string
  businessName: string
  budgetNumberLabel: string
  clientLabel: string
  expirationDateLabel: string
  createdByLabel: string
  viewBudgetLabel: string
  backupText: string
}, template: string = 'emails/budget_created') {
  const superUsers = await BusinessUser.query()
    .where('business_id', businessId)
    .where('is_super', true)
    .preload('user', (userQuery) => {
      userQuery.select(['personal_data_id', 'id', 'email'])
      userQuery.preload('personalData', (pdQ) => pdQ.select(['id', 'names', 'last_name_p', 'last_name_m']))
    })

  if (superUsers) {
    // Send email to each super user
    for (const businessUser of superUsers) {
      if (businessUser.user?.email) {
        await mail.send((message) => {
          message
            .to('piedraigor@gmail.com'/* businessUser.user!.email */)
            .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
            .subject(emailData.subject)
            .htmlView(template, emailData)
        })
        break
      }
    }
  }
}