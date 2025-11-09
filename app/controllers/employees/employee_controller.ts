import BusinessEmployee from '#models/business/business_employee'
import Employee from '#models/employees/employee'
import EmployeeLicenseHealth from '#models/employees/employee_license_health'
import EmployeePermit from '#models/employees/employee_permit'
// import Position from '#models/positions/position' // not used currently
import User from '#models/users/user'
import EmployeeAccessRepository from '#repositories/employees/employee_access_repository'
import EmployeeRepository from '#repositories/employees/employee_repository'
import { Google } from '#utils/Google'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import { HttpContext } from '@adonisjs/core/http'
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
// groupBy replacement (simple utility) so we avoid external dependency
const groupBy = (arr: any[], keys: string[]) => {
    return arr.reduce((acc: any, item: any) => {
        const composite = keys.map(k => item[k]).join('__')
        if (!acc[composite]) acc[composite] = []
        acc[composite].push(item)
        return acc
    }, {})
}

// NOTE: Implemented GCS image handling (photo & authorization) using Google util.

export default class EmployeeController {
    /** Create a new employee with related business link and nested collections */
    public async store({ request, response, auth, i18n }: HttpContext) {
        const { employeeStoreValidator } = await import('#validators/employee')
        const payload = await request.validateUsing(employeeStoreValidator)
        const dateTime = await Util.getDateTimes(request.ip())
        const trx = await db.transaction()

        try {
            // Expect JSON strings for nested collections similar to legacy
            JSON.parse(payload.schedule_work || '[]') // scheduleWork not yet implemented
            JSON.parse(payload.certificate_health || '[]') // certificateHealth not yet implemented
            const contactsEmergency = JSON.parse(payload.contacts_emergency || '[]')

            const photo = request.file('photo')
            const authorization = request.file('authorization')

            const employeeData: any = {
                identifyTypeId: payload.type_identify_id,
                identify: payload.identify,
                names: payload.names,
                lastNameP: payload.last_name_p,
                lastNameM: payload.last_name_m,
                stateCivilId: payload.state_civil ?? null,
                sexId: payload.sex_id,
                birthDate: payload.birth_date ? DateTime.fromISO(payload.birth_date) : null,
                nationalityId: payload.nationality_id,
                cityId: payload.city_id,
                address: payload.address,
                phone: payload.phone ?? null,
                movil: payload.movil,
                email: payload.email,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            }

            const businessEmployeeData: any = {
                businessId: payload.business_id,
                afpId: payload.afp_id,
                exRegimeId: payload.ex_regime_id,
                afp2Id: payload.afp2_id,
                coinAhorroId: payload.coin_ahorro_id,
                affiliationId: payload.affiliation_id,
                layoffId: payload.layoff_id,
                isapreId: payload.isapre_id,
                loadFamilyId: payload.load_family_id,
                remunerationTypeId: payload.remuneration_type_id,
                bankId: payload.bank_id,
                costCenterId: payload.cost_center_id,
                positionId: payload.position_id,
                typeAccountId: payload.type_account_id,
                admissionDate: payload.admission_date ? DateTime.fromISO(payload.admission_date) : null,
                contractDate: payload.contract_date ? DateTime.fromISO(payload.contract_date) : null,
                settlementDate: payload.settlement_date ? DateTime.fromISO(payload.settlement_date) : null,
                createdAt: dateTime,
                updatedAt: dateTime,
            }

            // Upload images if present
            if (photo) {
                const uploaded = await Google.uploadFile(photo, 'admin/employees')
                Object.assign(employeeData, {
                    photo: uploaded.url,
                    photo_short: uploaded.url_short,
                    thumb: uploaded.url_thumb,
                    thumb_short: uploaded.url_thumb_short,
                })
            }
            if (authorization) {
                const uploadedA = await Google.uploadFile(authorization, 'admin/authorizations')
                Object.assign(employeeData, {
                    authorization_mirror: uploadedA.url,
                    authorization_mirror_short: uploadedA.url_short,
                    thumb_authorization_mirror: uploadedA.url_thumb,
                    thumb_authorization_mirror_short: uploadedA.url_thumb_short,
                })
            }

            const employee = await Employee.create(employeeData, { client: trx })
            await employee.related('business').create(businessEmployeeData, { client: trx })

            // Attach nested collections if model relations exist in the future
            for (const c of contactsEmergency) {
                c.created_at = dateTime
                c.updated_at = dateTime
                c.created_by = auth.user!.id
                c.updated_by = auth.user!.id
            }

            await trx.commit()
            return response.status(201).json({
                employee,
                ...MessageFrontEnd(i18n.formatMessage('messages.store_ok'), i18n.formatMessage('messages.ok_title')),
            })
        } catch (error) {
            await trx.rollback()
            console.error(error)
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.store_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    /** Update base employee and business specific data */
    public async update({ request, params, auth, i18n, response }: HttpContext) {
        const employeeId = Number(params.id)
        const dateTime = await Util.getDateTimes(request.ip())
        const trx = await db.transaction()
        try {
            const { employeeUpdateValidator } = await import('#validators/employee')
            const payload = await request.validateUsing(employeeUpdateValidator)
            const employee = await Employee.find(employeeId)
            if (!employee) return response.status(404).json(MessageFrontEnd(i18n.formatMessage('messages.data_not_found'), i18n.formatMessage('messages.error_title')))

            // Build conditional patch for employee fields to avoid nulling omitted values
            const employeePatch: any = {
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            }
            if (payload.type_identify_id !== undefined) employeePatch.identifyTypeId = payload.type_identify_id
            if (payload.identify !== undefined) employeePatch.identify = payload.identify
            if (payload.names !== undefined) employeePatch.names = payload.names
            if (payload.last_name_p !== undefined) employeePatch.lastNameP = payload.last_name_p
            if (payload.last_name_m !== undefined) employeePatch.lastNameM = payload.last_name_m
            if (payload.state_civil !== undefined) employeePatch.stateCivilId = payload.state_civil
            if (payload.sex_id !== undefined) employeePatch.sexId = payload.sex_id
            if (payload.birth_date !== undefined) employeePatch.birthDate = payload.birth_date ? DateTime.fromISO(payload.birth_date) : null
            if (payload.nationality_id !== undefined) employeePatch.nationalityId = payload.nationality_id
            if (payload.city_id !== undefined) employeePatch.cityId = payload.city_id
            if (payload.address !== undefined) employeePatch.address = payload.address
            if (payload.phone !== undefined) employeePatch.phone = payload.phone
            if (payload.movil !== undefined) employeePatch.movil = payload.movil
            if (payload.email !== undefined) employeePatch.email = payload.email
            // Handle new photo / authorization uploads & remove old if needed
            const newPhoto = request.file('photo')
            if (newPhoto) {
                if ((employee as any).photo_short) {
                    try { await Google.deleteFile((employee as any).photo_short); } catch { }
                    if ((employee as any).thumb_short) { try { await Google.deleteFile((employee as any).thumb_short); } catch { } }
                    Object.assign(employee, { photo: null, photo_short: null, thumb: null, thumb_short: null })
                }
                const uploaded = await Google.uploadFile(newPhoto, 'admin/employees')
                Object.assign(employee, {
                    photo: uploaded.url,
                    photo_short: uploaded.url_short,
                    thumb: uploaded.url_thumb,
                    thumb_short: uploaded.url_thumb_short,
                })
            }
            const newAuthorization = request.file('authorization')
            if (newAuthorization) {
                if ((employee as any).authorization_mirror_short) {
                    try { await Google.deleteFile((employee as any).authorization_mirror_short); } catch { }
                    if ((employee as any).thumb_authorization_mirror_short) { try { await Google.deleteFile((employee as any).thumb_authorization_mirror_short); } catch { } }
                    Object.assign(employee, { authorization_mirror: null, authorization_mirror_short: null, thumb_authorization_mirror: null, thumb_authorization_mirror_short: null })
                }
                const uploadedA = await Google.uploadFile(newAuthorization, 'admin/authorizations')
                Object.assign(employee, {
                    authorization_mirror: uploadedA.url,
                    authorization_mirror_short: uploadedA.url_short,
                    thumb_authorization_mirror: uploadedA.url_thumb,
                    thumb_authorization_mirror_short: uploadedA.url_thumb_short,
                })
            }

            // Merge patch after potential file operations (we still call merge before save)
            employee.merge(employeePatch)
            await employee.useTransaction(trx).save()

            const businessEmployee = await BusinessEmployee.query({ client: trx })
                .where('business_id', payload.business_id)
                .where('employee_id', employeeId)
                .first()

            if (businessEmployee) {
                const patch: any = { updatedAt: dateTime }
                if (payload.afp_id !== undefined) patch.afpId = payload.afp_id
                if (payload.ex_regime_id !== undefined) patch.exRegimeId = payload.ex_regime_id
                if (payload.afp2_id !== undefined) patch.afp2Id = payload.afp2_id
                if (payload.coin_ahorro_id !== undefined) patch.coinAhorroId = payload.coin_ahorro_id
                if (payload.affiliation_id !== undefined) patch.affiliationId = payload.affiliation_id
                if (payload.layoff_id !== undefined) patch.layoffId = payload.layoff_id
                if (payload.isapre_id !== undefined) patch.isapreId = payload.isapre_id
                if (payload.load_family_id !== undefined) patch.loadFamilyId = payload.load_family_id
                if (payload.remuneration_type_id !== undefined) patch.remunerationTypeId = payload.remuneration_type_id
                if (payload.bank_id !== undefined) patch.bankId = payload.bank_id
                if (payload.type_account_id !== undefined) patch.typeAccountId = payload.type_account_id
                if (payload.cost_center_id !== undefined) patch.costCenterId = payload.cost_center_id
                if (payload.position_id !== undefined) patch.positionId = payload.position_id
                if (payload.admission_date !== undefined) patch.admissionDate = payload.admission_date ? DateTime.fromISO(payload.admission_date) : null
                if (payload.contract_date !== undefined) patch.contractDate = payload.contract_date ? DateTime.fromISO(payload.contract_date) : null
                if (payload.settlement_date !== undefined) patch.settlementDate = payload.settlement_date ? DateTime.fromISO(payload.settlement_date) : null
                businessEmployee.merge(patch)
                await businessEmployee.useTransaction(trx).save()
            }

            await trx.commit()
            return response.status(201).json(MessageFrontEnd(i18n.formatMessage('messages.update_ok'), i18n.formatMessage('messages.ok_title')))
        } catch (error) {
            await trx.rollback()
            console.error(error)
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.update_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    /** Show employee by token + business context */
    public async show({ params }: HttpContext) {
        const token = params.token
        const businessId = Number(params.business_id)
        const employee = await Employee.query()
            .where('token', token)
            .preload('createdBy', (b) => b.select(['id', 'email']))
            .preload('updatedBy', (b) => b.select(['id', 'email']))
            .preload('typeIdentify', (b) => b.select(['id', 'text']))
            .preload('city', (b) => b.select(['id', 'name']))
            .preload('nationality', (b) => b.select(['id', 'name']))
            .preload('sexes', (b) => b.select(['id', 'text']))
            .preload('business', (b) => {
                b.where('business_id', businessId)
                b.where('enabled', true)
                b.preload('business', (bb) => {
                    bb.select(['id', 'identify', 'name', 'url', 'url_thumb'])
                    bb.preload('typeIdentify', (tb) => tb.select(['id', 'text']))
                })
                b.preload('afp', (bb) => bb.select(['id', 'name']))
                b.preload('position', (bb) => bb.select(['id', 'name']))
            })
            .first()

        return employee
    }

    /** Find employees by identify */
    public async findByIdentify({ request, response, i18n }: HttpContext) {
        const { identify, type_identify, business_id } = request.all()
        const rows = await Employee.query()
            .where('identify', String(identify).trim())
            .where('identify_type_id', type_identify)
            .select(['id', 'identify_type_id', 'identify', 'names', 'last_name_p', 'last_name_m', 'birth_date'])
            .preload('business', (b) => {
                b.where('business_id', business_id)
                b.select(['id', 'enabled', 'employee_id', 'business_id'])
            })
            .preload('typeIdentify', (b) => b.select(['id', 'text']))

        const list = rows.map((e) => e.toJSON())
        if (!list.length) return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.search_empty'), i18n.formatMessage('messages.ok_title')))

        list[0].age = list[0].birth_date ? Math.trunc(DateTime.now().diff(DateTime.fromISO(list[0].birth_date), 'years').years) : null
        if (list[0].business?.length > 0) {
            list[0].enabled = list[0].business[0].enabled
            return list
        }
        return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.search_empty'), i18n.formatMessage('messages.ok_title')))
    }

    public async findById({ request }: HttpContext) {
        const { employeeId, businessId } = request.all()
        const employee = await Employee.query()
            .where('id', employeeId)
            .preload('city', (b) => b.select(['id', 'name']))
            .preload('business', (b) => {
                b.where('business_id', businessId)
                b.orderBy('id', 'desc')
            })
            .first()

        if (!employee) return null
        const data: any = employee.toJSON()
        data.birth_date_format = Util.parseDateSingle(data.birth_date)
        if (data.business?.[0]) {
            data.business[0].admission_date_format = Util.parseDateSingle(data.business[0].admission_date)
            data.business[0].contract_date_format = Util.parseDateSingle(data.business[0].contract_date)
            if (data.business[0].settlement_date) {
                data.business[0].settlement_date_format = Util.parseDateSingle(data.business[0].settlement_date)
            }
        }
        return data
    }

    public async findByName({ request, response, i18n }: HttpContext) {
        const { name, business_id } = request.all()
        const employees = await EmployeeRepository.findByName(business_id, name)
        if (!employees || !employees.length) return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.search_empty'), i18n.formatMessage('messages.ok_title')))
        for (const e of employees) {
            e.typeIdentify = { id: e.identify_type_id, text: e.text }
            if (e.birth_date) {
                const dt = DateTime.fromISO(e.birth_date)
                e.age = Math.trunc(DateTime.now().diff(dt, 'years').years)
                e.birth_date = dt.toFormat('dd/MM/yyyy') as any
            }
        }
        return employees
    }

    public async findByLastNameP({ request, response, i18n }: HttpContext) {
        const { last_name_p, business_id } = request.all()
        const employees = await EmployeeRepository.findByLastNameP(business_id, last_name_p)
        if (!employees || !employees.length) return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.search_empty'), i18n.formatMessage('messages.ok_title')))
        for (const e of employees) {
            e.typeIdentify = { id: e.identify_type_id, text: e.text }
            if (e.birth_date) {
                const dt = DateTime.fromISO(e.birth_date)
                e.birth_date = dt.toFormat('dd/MM/yyyy') as any
                e.age = Math.trunc(DateTime.now().diff(dt, 'years').years)
            }
        }
        return employees
    }

    public async deletePhoto({ request, response, i18n }: HttpContext) {
        const { employeeId } = request.all()
        const dateTime = await Util.getDateTimes(request.ip())
        const employee = await Employee.find(employeeId)
        if (!employee) return response.status(404).json(MessageFrontEnd(i18n.formatMessage('messages.data_not_found'), i18n.formatMessage('messages.error_title')))

        // Delete stored files if present
        if ((employee as any).photo_short) { try { await Google.deleteFile((employee as any).photo_short) } catch { } }
        if ((employee as any).thumb_short) { try { await Google.deleteFile((employee as any).thumb_short) } catch { } }
        employee.updatedAt = dateTime
        Object.assign(employee, { photo: null, photo_short: null, thumb: null, thumb_short: null })
        await employee.save()

        return response.status(201).json(MessageFrontEnd(i18n.formatMessage('messages.delete_ok'), i18n.formatMessage('messages.ok_title')))
    }

    public async countActive({ params }: HttpContext) {
        const businessId = Number(params.business_id)
        const result = await db.from('business_employees').where('enabled', true).where('business_id', businessId).count('* as total')
        return result[0].total
    }

    public async report({ request }: HttpContext) {
        const { condition, expire_date, cost_center, business_id } = request.all()
        const report = await EmployeeRepository.report(condition, expire_date, cost_center, business_id)
        return report.map((r) => ({
            token: r.token,
            nombre: r.names,
            identificacion: `${r.type_identify} ${r.identify}`,
            apellidos: `${r.last_name_p} ${r.last_name_m}`,
            estado: r.enabled ? 'Activo' : 'Inactivo',
        }))
    }

    public async inactive({ request, auth, response, i18n }: HttpContext) {
        const { business_employee_id } = request.all()
        const dateTime = await Util.getDateTimes(request.ip())
        try {
            const businessEmployee = await BusinessEmployee.find(business_employee_id)
            if (!businessEmployee) return response.status(404).json(MessageFrontEnd(i18n.formatMessage('messages.data_not_found'), i18n.formatMessage('messages.error_title')))
            businessEmployee.enabled = false
                ; (businessEmployee as any).inactive_at = dateTime
                ; (businessEmployee as any).inactive_by = auth.user!.id
            await businessEmployee.save()
            return response.status(201).json(MessageFrontEnd(i18n.formatMessage('messages.inactive_ok'), i18n.formatMessage('messages.ok_title')))
        } catch (error) {
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.inactive_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    public async reactive({ request, response, i18n }: HttpContext) {
        const { business_employee_id } = request.all()
        try {
            const businessEmployee = await BusinessEmployee.find(business_employee_id)
            if (!businessEmployee) return response.status(404).json(MessageFrontEnd(i18n.formatMessage('messages.data_not_found'), i18n.formatMessage('messages.error_title')))
            businessEmployee.enabled = true
                ; (businessEmployee as any).inactive_at = null
                ; (businessEmployee as any).inactive_by = null
            await businessEmployee.save()
            return response.status(201).json(MessageFrontEnd(i18n.formatMessage('messages.reactive_ok'), i18n.formatMessage('messages.ok_title')))
        } catch (error) {
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.reactive_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    public async findWorkPermits({ request, auth }: HttpContext) {
        const { employee_id, business_id } = request.all()
        const permits = await EmployeePermit.query().where('employee_id', employee_id).where('business_id', business_id).orderBy('id', 'desc')
        const result = permits.map((p) => {
            const json = p.toJSON()
                ; (json as any).is_authorizer = json.authorizer_id === auth.user!.id
            return json
        })
        return result
    }

    public async storeWorkPermits({ request, response, auth, i18n }: HttpContext) {
        const dateTime = await Util.getDateTimes(request.ip())
        const { employeePermitStoreValidator } = await import('#validators/employee')
        const { type, date_start, date_end, reason, employee_id, business_id, authorizer_id } = await request.validateUsing(employeePermitStoreValidator)

        try {
            const permit = await EmployeePermit.create({
                type,
                date_start,
                date_end,
                reason,
                employee_id,
                business_id,
                authorizer_id,
                authorized: false,
                created_at: dateTime,
                updated_at: dateTime,
                created_by: auth.user!.id,
                updated_by: auth.user!.id,
            } as any)

            const employee = await Employee.find(employee_id)
            const authorizer = await User.find(authorizer_id)
            if (employee && authorizer) {
                emitter.emit('new::employeePermitStore', {
                    email: (employee as any).email,
                    full_name: `${employee.names} ${(employee as any).lastNameP || (employee as any).last_name_p || ''} ${(employee as any).lastNameM || (employee as any).last_name_m || ''}`.trim(),
                    token: permit.token,
                })
                emitter.emit('new::employeePermitStoreAuthorizer', {
                    email: authorizer.email,
                    full_name: (authorizer as any).full_name,
                    token: permit.token,
                })
            }

            return response.status(201).json({
                permit,
                ...MessageFrontEnd(i18n.formatMessage('messages.store_ok'), i18n.formatMessage('messages.ok_title')),
            })
        } catch (error) {
            console.error(error)
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.store_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    public async showWorkPermitByToken({ params }: HttpContext) {
        const token = params.token
        const permit = await EmployeePermit.query()
            .where('token', token)
            .preload('employee', (b) => b.preload('typeIdentify'))
            .preload('business', (b) => b.select(['id', 'identify', 'name', 'url', 'url_thumb', 'email', 'phone']))
            .preload('authorizer', (b) => b.select(['id', 'identify', 'type_identify_id']))
            .first()
        if (!permit) return null
        const result: any = permit.toJSON()
        // Resolve authorizer position within the same business via BusinessEmployee -> Position
        try {
            if (permit.authorizerId) {
                const authorizer = await User.find(permit.authorizerId)
                const authorizerEmployeeId = authorizer?.employeeId
                if (authorizerEmployeeId) {
                    const be = await BusinessEmployee.query()
                        .where('business_id', permit.businessId)
                        .where('employee_id', authorizerEmployeeId)
                        .preload('position', (b) => b.select(['id', 'name']))
                        .first()
                    if (be) {
                        result.authorizer_position = be.position ? be.position.name : null
                        result.authorizer_position_id = be.positionId
                    }
                }
            }
        } catch { }
        result.date_start_format = result.date_start ? Util.parseDateFormatFriendlyText(DateTime.fromISO(result.date_start)) : null
        result.date_end_format = result.date_end ? Util.parseDateFormatFriendlyText(DateTime.fromISO(result.date_end)) : null
        return result
    }

    public async autorizePermit({ request, response, auth, i18n }: HttpContext) {
        const { permit_id } = request.all()
        const dateTime = await Util.getDateTimes(request.ip())
        const permit = await EmployeePermit.find(permit_id)
        if (!permit) return response.status(404).json(MessageFrontEnd(i18n.formatMessage('messages.data_not_found'), i18n.formatMessage('messages.error_title')))
        if (!(permit as any).authorized && permit.authorizerId === auth.user!.id) {
            ; (permit as any).authorized = true
                ; (permit as any).authorized_at = dateTime
            await permit.save()
            return response.status(201).json(MessageFrontEnd(i18n.formatMessage('messages.authorized_ok'), i18n.formatMessage('messages.ok_title')))
        }
        return response.status(200).json(MessageFrontEnd(i18n.formatMessage('messages.authorized_error'), i18n.formatMessage('messages.error_title')))
    }

    public async deletePermit({ request, response, auth, i18n }: HttpContext) {
        const { permit_id } = request.all()
        const dateTime = await Util.getDateTimes(request.ip())
        const permit = await EmployeePermit.find(permit_id)
        if (!permit) return response.status(404).json(MessageFrontEnd(i18n.formatMessage('messages.data_not_found'), i18n.formatMessage('messages.error_title')))
        permit.enabled = !permit.enabled
        permit.updatedAt = dateTime
        permit.updatedById = auth.user!.id
        await permit.save()
        return response.status(201).json({
            permit,
            ...MessageFrontEnd(i18n.formatMessage('messages.update_ok'), i18n.formatMessage('messages.ok_title')),
        })
    }

    public async findLicensesHealth({ request }: HttpContext) {
        const { employee_id, business_id } = request.all()
        const rows = await EmployeeLicenseHealth.query().where('employee_id', employee_id).where('business_id', business_id).orderBy('id', 'desc').preload('typeLicense')
        return rows
    }

    public async storeLicenseHealth({ request, response, auth, i18n }: HttpContext) {
        try {
            const dateTime = await Util.getDateTimes(request.ip())
            const { employeeLicenseHealthStoreValidator } = await import('#validators/employee')
            const payload = await request.validateUsing(employeeLicenseHealthStoreValidator)
            const license = await EmployeeLicenseHealth.create({
                ...payload,
                created_at: dateTime,
                updated_at: dateTime,
                created_by: auth.user!.id,
                updated_by: auth.user!.id,
            } as any)
            await license.load('typeLicense')
            return response.status(201).json({
                licenseHealth: license,
                ...MessageFrontEnd(i18n.formatMessage('messages.store_ok'), i18n.formatMessage('messages.ok_title')),
            })
        } catch (error) {
            console.error(error)
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.store_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    public async updateLicenseHealth({ request, response, auth, i18n, params }: HttpContext) {
        const licenseId = params.id
        const dateTime = await Util.getDateTimes(request.ip())
        const { employeeLicenseHealthUpdateValidator } = await import('#validators/employee')
        const payload = await request.validateUsing(employeeLicenseHealthUpdateValidator)
        const license = await EmployeeLicenseHealth.find(licenseId)
        if (!license) return response.status(404).json(MessageFrontEnd(i18n.formatMessage('messages.data_not_found'), i18n.formatMessage('messages.error_title')))
        try {
            license.merge({ ...payload, updated_at: dateTime, updated_by: auth.user!.id } as any)
            await license.save()
            await license.load('typeLicense')
            return response.status(201).json({
                license,
                ...MessageFrontEnd(i18n.formatMessage('messages.update_ok'), i18n.formatMessage('messages.ok_title')),
            })
        } catch (error) {
            console.error(error)
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.store_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    public async deleteLicenseHealth({ params, response, i18n }: HttpContext) {
        const licenseId = params.id
        try {
            await db.from('employee_license_healths').where('id', licenseId).delete()
            return response.status(201).json(MessageFrontEnd(i18n.formatMessage('messages.delete_ok'), i18n.formatMessage('messages.ok_title')))
        } catch (error) {
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.delete_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    public async findAccess({ request }: HttpContext) {
        let { condition, work_id, date_start, date_end } = request.all()
        const dateTime = await Util.getDateTimes(request.ip())
        if (condition === 1) {
            date_start = dateTime.toFormat('yyyy-LL-dd')
            date_end = date_start
        } else if (condition === 2) {
            const prev = dateTime.minus({ days: 1 })
            date_start = prev.toFormat('yyyy-LL-dd')
            date_end = date_start
        } else if (condition === 3) {
            date_start = dateTime.startOf('month').toFormat('yyyy-LL-dd')
            date_end = dateTime.endOf('month').toFormat('yyyy-LL-dd')
        }
        if (work_id > 0) {
            return EmployeeAccessRepository.findAccessByWorkId(work_id, date_start, date_end)
        }
        return []
    }

    public async findAccessByEmployeeId({ request }: HttpContext) {
        let { employee_id, condition, date_start, date_end } = request.all()
        const dateTime = await Util.getDateTimes(request.ip())
        if (condition === 1) {
            date_start = dateTime.toFormat('yyyy-LL-dd')
            date_end = date_start
        } else if (condition === 2) {
            const prev = dateTime.minus({ days: 1 })
            date_start = prev.toFormat('yyyy-LL-dd')
            date_end = date_start
        } else if (condition === 3) {
            date_start = dateTime.startOf('month').toFormat('yyyy-LL-dd')
            date_end = dateTime.endOf('month').toFormat('yyyy-LL-dd')
        }
        const access = await EmployeeAccessRepository.findAccessByEmployeeId(employee_id, date_start, date_end)
        const grouped = groupBy(access, ['date'])
        return grouped
    }
}
