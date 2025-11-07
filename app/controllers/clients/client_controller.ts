import Client from '#models/clients/client'
import ClientFile from '#models/clients/client_file'
import ClientRepository from '#repositories/clients/client_repository'
import { Google } from '#utils/Google'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import { clientStoreValidator, clientUpdateValidator } from '#validators/client'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import console from 'node:console'

export default class ClientController {
    // GET /client/ (optionally could be paginated in future)
    public async index({ response, i18n }: HttpContext) {
        try {
            const clients = await Client.query()
                .preload('city', (builder) => {
                    builder.select(['id', 'country_id'])
                })
                .preload('contact', (builder) => {
                    builder.select(['client_id', 'identify_type_id', 'identify', 'name', 'phone', 'email'])
                    builder.preload('typeIdentify', (b) => b.select(['id', 'text']))
                })
                .preload('typeIdentify', (builder) => builder.select(['id', 'text']))
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
            return clients
        } catch (error) {
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }

    // POST /client/store
    public async store({ request, response, auth, i18n }: HttpContext) {
        const data = await request.validateUsing(clientStoreValidator)
        const dateTime = await Util.getDateTimes(request.ip())
        const trx = await db.transaction()
        try {
            // Check duplicate document
            const exists = await Client.query({ client: trx })
                .where('identify_type_id', data.identifyTypeId)
                .where('identify', data.identify)
                .first()
            if (exists) {
                return response.status(422).json(
                    MessageFrontEnd(
                        i18n.formatMessage('messages.documentExist'),
                        i18n.formatMessage('messages.error_title')
                    )
                )
            }

            // Responsibles array (optional JSON string or array)
            let responsibles: any[] = []
            const rawResponsibles = request.input('responsibles')
            if (rawResponsibles) {
                try {
                    responsibles = Array.isArray(rawResponsibles)
                        ? rawResponsibles
                        : JSON.parse(rawResponsibles)
                } catch { }
            }

            const fromWeb = request.input('from_web') || request.input('fromWeb')

            const payload: Record<string, any> = {
                identifyTypeId: data.identifyTypeId,
                identify: data.identify,
                name: data.name,
                phone: data.phone,
                email: data.email,
                address: data.address,
                typeId: data.typeId,
                cityId: data.cityId,
                giro: data.giro,
                createdById: fromWeb ? -1 : auth.user!.id,
                updatedById: fromWeb ? -1 : auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            }

            // Handle main photo upload (optional)
            const photo = request.file('photo')
            if (photo) {
                const { url, url_short, url_thumb, url_thumb_short } = await Google.uploadFile(photo, 'clients')
                payload.url = url
                payload.urlShort = url_short
                payload.urlThumb = url_thumb
                payload.urlThumbShort = url_thumb_short
            }

            const client = await Client.create(payload, { client: trx })
            client.useTransaction(trx)

            // Contacts
            if (responsibles.length) {
                const contactRows = responsibles.map((r) => ({
                    name: r.name,
                    phone: r.phone,
                    email: r.email,
                    identifyTypeId: r.identify_type_id ?? r.identifyTypeId,
                    identify: r.identify,
                    clientContactTypeId: r.client_contact_type_id ?? r.clientContactTypeId,
                    createdById: auth.user!.id,
                    updatedById: auth.user!.id,
                    createdAt: dateTime,
                    updatedAt: dateTime,
                }))
                await client.related('contact').createMany(contactRows, { client: trx })
            }

            // Upload additional files (optional, supports multiple files under `files`)
            const uploadFiles = request.files('files', { size: '30mb' })
            if (uploadFiles && uploadFiles.length) {
                const rows: Partial<ClientFile>[] = []
                for (const f of uploadFiles) {
                    if (!f.tmpPath) continue
                    const isImage = (f.type || '').startsWith('image')
                    const { url, url_short } = await Google.uploadFile(f, 'clients', isImage ? 'image' : 'file')
                    rows.push({
                        url,
                        urlShort: url_short,
                        name: f.clientName ?? 'file',
                        title: f.clientName ?? 'file',
                        createdBy: fromWeb ? -1 : auth.user!.id,
                        updatedBy: fromWeb ? -1 : auth.user!.id,
                        createdAt: dateTime,
                        updatedAt: dateTime,
                    })
                }
                if (rows.length) {
                    await client.related('files').createMany(rows, { client: trx })
                }
            }

            await trx.commit()
            await client.load('createdBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })
            await client.load('updatedBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })
            await client.load('typeIdentify', (builder) => builder.select(['id', 'text']))
            await client.load('city', (builder) => builder.select(['id', 'country_id']))
            await client.load('files')

            return response.status(201).json({
                client,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_ok'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            await trx.rollback()
            console.log(error);
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.store_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }

    // PUT /client/update/:id
    public async update({ params, request, response, auth, i18n }: HttpContext) {
        const clientId = params.id
        const data = await request.validateUsing(clientUpdateValidator)
        const dateTime = await Util.getDateTimes(request.ip())
        const trx = await db.transaction()
        try {
            const client = await Client.findOrFail(clientId, { client: trx })
            client.useTransaction(trx)

            const payload: Record<string, any> = {}
            if (data.identifyTypeId !== undefined) payload.identifyTypeId = data.identifyTypeId
            if (data.identify !== undefined) payload.identify = data.identify
            if (data.name !== undefined) payload.name = data.name
            if (data.phone !== undefined) payload.phone = data.phone
            if (data.email !== undefined) payload.email = data.email
            if (data.address !== undefined) payload.address = data.address
            if (data.typeId !== undefined) payload.typeId = data.typeId
            if (data.cityId !== undefined) payload.cityId = data.cityId
            if (data.giro !== undefined) payload.giro = data.giro

            // If a new photo is provided, delete previous files and upload new
            const photo = request.file('photo')
            if (photo) {
                if (client.urlShort) {
                    try { await Google.deleteFile(client.urlShort) } catch { }
                }
                if (client.urlThumbShort) {
                    try { await Google.deleteFile(client.urlThumbShort) } catch { }
                }
                const { url, url_short, url_thumb, url_thumb_short } = await Google.uploadFile(photo, 'clients')
                payload.url = url
                payload.urlShort = url_short
                payload.urlThumb = url_thumb
                payload.urlThumbShort = url_thumb_short
            }

            client.merge({ ...payload, updatedAt: dateTime, updatedById: auth.user!.id })
            await client.save()

            // Replace contacts if responsibles provided
            let responsibles: any[] = []
            const rawResponsibles = request.input('responsibles')
            if (rawResponsibles) {
                try {
                    responsibles = Array.isArray(rawResponsibles)
                        ? rawResponsibles
                        : JSON.parse(rawResponsibles)
                } catch { }
            }

            if (responsibles.length) {
                await client.useTransaction(trx).related('contact').query().delete()
                const contactRows = responsibles.map((r) => ({
                    name: r.name,
                    phone: r.phone,
                    email: r.email,
                    identifyTypeId: r.identifyTypeId ?? r.identify_type_id,
                    identify: r.identify,
                    clientContactTypeId: r.clientContactTypeId ?? r.client_contact_type_id,
                    createdById: auth.user!.id,
                    updatedById: auth.user!.id,
                    createdAt: dateTime,
                    updatedAt: dateTime,
                }))
                await client.related('contact').createMany(contactRows, { client: trx })
            }

            await trx.commit()
            await client.load('createdBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })
            await client.load('updatedBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })
            await client.load('typeIdentify', (builder) => builder.select(['id', 'text']))
            await client.load('city', (builder) => builder.select(['id', 'country_id']))


            // Upload any new files appended in this update (same behavior as store)
            const fromWeb = request.input('from_web') || request.input('fromWeb')
            const uploadFiles = request.files('files', { size: '30mb' })
            const authUser = auth.user!
            if (uploadFiles && uploadFiles.length) {
                const rows: Partial<ClientFile>[] = []
                for (const f of uploadFiles) {
                    if (!f.tmpPath) continue
                    const isImage = (f.type || '').startsWith('image')
                    const { url, url_short } = await Google.uploadFile(f, 'clients', isImage ? 'image' : 'file')
                    rows.push({
                        url,
                        urlShort: url_short,
                        name: f.clientName ?? 'file',
                        title: f.clientName ?? 'file',
                        createdBy: fromWeb ? -1 : authUser.id,
                        updatedBy: fromWeb ? -1 : authUser.id,
                        createdAt: dateTime,
                        updatedAt: dateTime,
                    })
                }
                if (rows.length) {
                    await client.related('files').createMany(rows as any)
                }
            }

            await client.load('files')

            return response.status(201).json({
                client,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_ok'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            console.error('Error updating client:', error)
            await trx.rollback()
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }

    // PUT /client/change-status/:id
    public async changeStatus({ params, request, response, auth, i18n }: HttpContext) {
        const clientId = params.id
        const dateTime = await Util.getDateTimes(request.ip())

        try {
            const client = await Client.findOrFail(clientId)
            const status = !client.enabled
            client.merge({ enabled: status, updatedById: auth.user!.id, updatedAt: dateTime })
            await client.save()

            await client.load('createdBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })
            await client.load('updatedBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })
            await client.load('typeIdentify', (builder) => builder.select(['id', 'text']))

            return response.status(201).json({
                client,
                ...MessageFrontEnd(
                    i18n.formatMessage(client.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
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

    // POST /client/findAutoComplete
    public async findAutoComplete({ request }: HttpContext) {
        const { val } = await request.validateUsing(
            vine.compile(
                vine.object({ val: vine.string().trim() })
            )
        )
        const result = await ClientRepository.findAutoComplete(val)
        return result
    }

    // GET /client/show/:id
    public async show({ params }: HttpContext) {
        const clientId = params.id
        const client = await Client.query()
            .where('id', clientId)
            .preload('typeIdentify', (b) => b.select(['id', 'text']))
            .preload('city', (builder) => {
                builder.preload('country', (b) => b.select(['id', 'name']))
            })
            .preload('documentInvoice')
            .first()
        return client
    }

    // DELETE /client/delete/photo/:id
    public async deletePhoto({ params, response, i18n }: HttpContext) {
        try {
            const client = await Client.findOrFail(params.id)

            if (client.urlShort) {
                try { await Google.deleteFile(client.urlShort) } catch { }
            }
            if (client.urlThumbShort) {
                try { await Google.deleteFile(client.urlThumbShort) } catch { }
            }

            client.merge({ url: '', urlShort: '', urlThumb: '', urlThumbShort: '' })
            await client.save()

            await client.load('createdBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })
            await client.load('updatedBy', (builder) => {
                builder
                    .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                    .select(['id', 'personal_data_id', 'email'])
            })
            await client.load('typeIdentify', (builder) => builder.select(['id', 'text']))

            return response.status(201).json({
                client,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.ok_delete'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            return response.status(201).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.delete_error'),
                    i18n.formatMessage('messages.ok_title')
                )
            )
        }
    }

    // POST /client/find/params
    public async findByParams({ request, response, i18n }: HttpContext) {
        const { email } = await request.validateUsing(
            vine.compile(vine.object({ email: vine.string().email() }))
        )
        const client = await ClientRepository.findByParams(email)
        if (client) return client
        return response.status(404).json(
            MessageFrontEnd(
                i18n.formatMessage('messages.search_error'),
                i18n.formatMessage('messages.error_title')
            )
        )
    }

    // POST /client/search
    public async search({ request }: HttpContext) {
        const { value } = await request.validateUsing(
            vine.compile(vine.object({ value: vine.string().trim() }))
        )
        const params = value.replace(/\s/g, '%')
        const result = await ClientRepository.search(params)
        return result
    }

    // POST /client-web/find-profile
    public async finProfileClientById({ request }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(vine.object({ id: vine.number().positive() }))
        )
        const client = await Client.query()
            .where('id', id)
            .preload('typeIdentify', (b) => b.select(['id', 'text']))
            .preload('city', (builder) => {
                builder.preload('country', (b) => b.select(['id', 'name']))
            })
            .preload('contact', (builder) => {
                builder.preload('typeContact', (b) => b.select(['id', 'text']))
            })
            .preload('documentInvoice')
            .preload('files')
            .first()
        return client
    }

    // POST /client-web/delete-file
    public async deleteFile({ request, response, i18n }: HttpContext) {
        const { id } = await request.validateUsing(
            vine.compile(vine.object({ id: vine.number().positive() }))
        )

        try {
            const file = await ClientFile.findOrFail(id)
            // Try deleting original file
            if (file.urlShort) {
                try { await Google.deleteFile(file.urlShort) } catch { }
                // Attempt to delete a potential thumbnail if it follows the same naming scheme
                const idx = file.urlShort.lastIndexOf('/')
                if (idx > -1) {
                    const base = file.urlShort.substring(0, idx)
                    const name = file.urlShort.substring(idx + 1)
                    const thumb = `${base}/thumb_${name}`
                    try { await Google.deleteFile(thumb) } catch { }
                }
            }

            await file.delete()

            return response.status(201).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.ok_delete'),
                    i18n.formatMessage('messages.ok_title')
                )
            )
        } catch (error) {
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.delete_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }
}
