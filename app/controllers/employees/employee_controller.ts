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
import {
    employeeBusinessEmployeeIdValidator,
    employeeDeletePhotoValidator,
    employeeFindAccessByEmployeeIdValidator,
    employeeFindAccessValidator,
    employeeFindByIdentifyValidator,
    employeeFindByIdValidator,
    employeeFindByLastNamePValidator,
    employeeFindByNameValidator,
    employeeFindLicensesHealthValidator,
    employeeFindWorkPermitsValidator,
    employeePermitIdValidator,
    employeeReportValidator,
} from '#validators/employee'
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
    // Date parsing helpers (accept ISO string or JS Date)
    private toDt(value?: unknown): DateTime | null {
        if (value == null) return null
        if (typeof value === 'string') {
            const dt = DateTime.fromISO(value)
            return dt.isValid ? dt : null
        }
        if (value instanceof Date) {
            const dt = DateTime.fromJSDate(value)
            return dt.isValid ? dt : null
        }
        return null
    }

    private fmtDateTime(value?: unknown): string | null {
        const dt = this.toDt(value)
        return dt ? dt.toFormat('dd/MM/yyyy hh:mm:ss a').toLowerCase() : null
    }

    private mapBusinessItemLegacy(be: any): any {
        const item = { ...be }
        if (item.created_by_id !== undefined) {
            item.created_by = item.created_by_id
            delete item.created_by_id
        }
        if (item.updated_by_id !== undefined) {
            item.updated_by = item.updated_by_id
            delete item.updated_by_id
        }
        if (item.afp_2_id !== undefined && item.afp2_id === undefined) {
            item.afp2_id = item.afp_2_id
            delete item.afp_2_id
        }
        if (item.created_at) item.created_at = this.fmtDateTime(item.created_at)
        if (item.updated_at) item.updated_at = this.fmtDateTime(item.updated_at)
        const ad = this.toDt(item.admission_date)
        if (ad) {
            item.admission_date_format = ad.toFormat('yyyy-LL-dd')
            item.admission_date = ad.toFormat('dd/MM/yyyy')
        }
        const cd = this.toDt(item.contract_date)
        if (cd) {
            item.contract_date_format = cd.toFormat('yyyy-LL-dd')
            item.contract_date = cd.toFormat('dd/MM/yyyy')
        }
        const sd = this.toDt(item.settlement_date)
        if (sd) {
            item.settlement_date_format = sd.toFormat('yyyy-LL-dd')
            item.settlement_date = sd.toFormat('dd/MM/yyyy')
        }
        if (item.full_name) delete item.full_name
        return item
    }

    private toLegacyEmployee(raw: any): any {
        const data = { ...raw }
        const bd = this.toDt(data.birth_date)
        if (bd) {
            data.birth_date = bd.toFormat('dd/MM/yyyy')
            data.birth_date_format = bd.toFormat('yyyy-LL-dd')
        } else {
            data.birth_date_format = null
        }
        if (data.created_at) data.created_at = this.fmtDateTime(data.created_at)
        if (data.updated_at) data.updated_at = this.fmtDateTime(data.updated_at)

        if (data.created_by_id !== undefined) {
            data.created_by = data.created_by_id
            delete data.created_by_id
        }
        if (data.updated_by_id !== undefined) {
            data.updated_by = data.updated_by_id
            delete data.updated_by_id
        }

        if (data.city && data.city.country && data.city.country.id && data.city.country_id === undefined) {
            data.city.country_id = data.city.country.id
        }

        if (!data.scheduleWork) data.scheduleWork = []
        // Normalize certificate health property name for legacy clients
        if (data.certificateHealth !== undefined && data.certificateHeatlh === undefined) {
            data.certificateHeatlh = data.certificateHealth
            delete data.certificateHealth
        }
        if (!data.certificateHeatlh) data.certificateHeatlh = []
        if (!data.emergencyContacts) data.emergencyContacts = []
        if (data.full_name) delete data.full_name

        if (Array.isArray(data.business)) {
            data.business = data.business.map((be: any) => this.mapBusinessItemLegacy(be))
        }

        return data
    }

    // Helper for search endpoints (lightweight mapping)
    private mapSearchEmployee(obj: any): any {
        const out: any = { ...obj }
        const bd = this.toDt(out.birth_date)
        if (bd) {
            out.birth_date_format = bd.toFormat('yyyy-LL-dd')
            out.birth_date = bd.toFormat('dd/MM/yyyy')
            out.age = Math.trunc(DateTime.now().diff(bd, 'years').years)
        } else {
            out.birth_date_format = null
            out.age = null
        }
        if (out.business?.length > 0 && out.business[0]?.enabled !== undefined) {
            out.enabled = out.business[0].enabled
        }
        if (out.city && out.city.country && out.city.country.id && out.city.country_id === undefined) {
            out.city.country_id = out.city.country.id
        }
        if (out.full_name) delete out.full_name
        return out
    }
    /** Create a new employee with related business link and nested collections */
    public async store({ request, response, auth, i18n }: HttpContext) {
        const { employeeStoreValidator } = await import('#validators/employee')
        const payload = await request.validateUsing(employeeStoreValidator)
        const dateTime = await Util.getDateTimes(request.ip())
        const trx = await db.transaction()
        const authUserId = auth.user!.id

        try {
            // Nested collections are now arrays of objects (validator updated)
            const scheduleWork: Record<string, any>[] = Array.isArray((payload as any).scheduleWork) ? (payload as any).scheduleWork : []
            const certificateHealthRaw: Record<string, any>[] = Array.isArray((payload as any).certificateHealth) ? (payload as any).certificateHealth : []
            const contactsEmergencyRaw: Record<string, any>[] = Array.isArray((payload as any).contactsEmergency) ? (payload as any).contactsEmergency : []

            // Debug: nested collections received (disabled in production)

            const photo = request.file('photo')
            const authorization = request.file('authorization')

            const employeeData: any = {
                identifyTypeId: payload.typeIdentifyId,
                identify: payload.identify,
                names: payload.names,
                lastNameP: payload.lastNameP,
                lastNameM: payload.lastNameM,
                stateCivilId: payload.stateCivil ?? null,
                sexId: payload.sexId,
                birthDate: payload.birthDate ? DateTime.fromISO(payload.birthDate) : null,
                nationalityId: payload.nationalityId,
                cityId: payload.cityId,
                address: payload.address,
                phone: payload.phone ?? null,
                movil: payload.movil,
                email: payload.email,
                createdById: authUserId,
                updatedById: authUserId,
                createdAt: dateTime,
                updatedAt: dateTime,
            }

            const businessEmployeeData: any = {
                businessId: payload.businessId,
                afpId: payload.afpId ?? 0,
                afpPercentage: payload.afpPercentage ?? 0,
                exRegimeId: payload.exRegimeId ?? 0,
                afp2Id: payload.afp2Id ?? 0,
                afp2Ahorro: payload.afp2Ahorro ?? 0,
                coinAhorroId: payload.coinAhorroId ?? 0,
                typeContractId: payload.typeContractId ?? 0,
                affiliationId: payload.affiliationId ?? 0,
                layoffId: payload.layoffId ?? 0,
                isapreId: payload.isapreId ?? 0,
                loadFamilyId: payload.loadFamilyId ?? 0,
                loadFamilyNormal: payload.loadFamilyNormal ?? 0,
                loadFamilyInvalidate: payload.loadFamilyInvalidate ?? 0,
                weeklyShiftHours: payload.weeklyShiftHours ?? 0,
                viewLiquidation: payload.viewLiquidation ?? false,
                healthPactValue: payload.healthPactValue ?? 0,
                healthPactCoinId: payload.healthPactCoinId ?? 0,
                mountPact: payload.mountPact ?? 0,
                additionalPact: payload.additionalPact ?? 0,
                remunerationTypeId: payload.remunerationTypeId ?? 0,
                remunerationAmount: payload.remunerationAmount ?? 0,
                legalGratificationId: payload.legalGratificationId ?? 0,
                bankId: payload.bankId ?? 0,
                typeAccountId: payload.typeAccountId ?? 0,
                nroAccount: payload.nroAccount ?? null,
                owner: payload.owner ?? null,
                zoneBonus: payload.zoneBonus ?? 0,
                snacksBonus: payload.snacksBonus ?? 0,
                mobilizationsBonus: payload.mobilizationsBonus ?? 0,
                businessSalaryId: payload.businessSalaryId ?? 0,
                quoteSis: payload.quoteSis ?? false,
                costCenterId: payload.costCenterId ?? 0,
                positionId: payload.positionId ?? 0,
                admissionDate: payload.admissionDate ? DateTime.fromISO(payload.admissionDate) : null,
                contractDate: payload.contractDate ? DateTime.fromISO(payload.contractDate) : null,
                settlementDate: payload.settlementDate ? DateTime.fromISO(payload.settlementDate) : null,
                createdAt: dateTime,
                updatedAt: dateTime,
                createdById: authUserId,
                updatedById: authUserId,
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
            const businessId = payload.businessId
            const employee = await Employee.create(employeeData, { client: trx })
            await employee.related('business').create(businessEmployeeData, { client: trx })

            // Map certificate health entries to expected shape (certificate health != license health)
            if (certificateHealthRaw?.length) {
                const certs: Array<{ healthItemId: number }> = []
                for (const c of certificateHealthRaw) {
                    const healthItemId = c.healthItemId
                    if (!healthItemId) continue
                    certs.push({ healthItemId: Number(healthItemId) })
                }
                if (certs.length) {
                    await employee.related('certificateHealth').createMany(certs, { client: trx })
                }
            }

            // Map emergency contacts to expected shape
            if (contactsEmergencyRaw?.length) {
                const contacts: Array<{ fullName: string; phone1: string; phone2: string | null; relationshipId: number; createdById?: number; updatedById?: number }> = []
                for (const c of contactsEmergencyRaw) {
                    const fullName = c.fullName ?? c.name
                    const phone1 = c.phone1 ?? c.phone
                    const phone2 = c.phone2 ?? null
                    const relationshipId = c.relationshipId ?? c.relationId
                    if (!fullName || !phone1 || !relationshipId) continue
                    contacts.push({
                        fullName: String(fullName),
                        phone1: String(phone1),
                        phone2: phone2 ? String(phone2) : null,
                        relationshipId: Number(relationshipId),
                        createdById: authUserId,
                        updatedById: authUserId,
                    })
                }
                if (contacts.length) {
                    await employee.related('emergencyContacts').createMany(contacts as any, { client: trx })
                }
            }


            const normalizedScheduleWork: Array<{ workId: number; scheduleId: number; businessId: number; art22: boolean }> = []
            for (const item of scheduleWork) {
                const workId = item.workId ?? item.work_id
                const scheduleId = item.scheduleId ?? item.schedule_id
                if (!workId || !scheduleId) continue
                normalizedScheduleWork.push({
                    workId: Number(workId),
                    scheduleId: Number(scheduleId),
                    businessId: Number(businessId),
                    art22: item.art22 === undefined ? false : Boolean(item.art22),
                })
            }
            if (normalizedScheduleWork.length) {
                await employee.related('scheduleWork').createMany(normalizedScheduleWork as any, { client: trx })
            }
            // (contacts metadata already set during mapping)

            await trx.commit()

            // Preload relations needed for legacy-shaped response
            await employee.load('business')
            await employee.load('certificateHealth')
            await employee.load('emergencyContacts')
            await employee.load('city', (b) => {
                b.select(['id', 'name', 'country_id'])
                b.preload('country', (cb) => cb.select(['id', 'name']))
            })
            await employee.load('scheduleWork', (b) => {
                b.preload('schedule')
                b.preload('work')
            })

            // Map to legacy shape (formats, aliases, etc.)
            const legacy = this.toLegacyEmployee(employee.toJSON())
            if ((legacy as any).certificateHeatlh === undefined && (legacy as any).certificateHealth !== undefined) {
                ; (legacy as any).certificateHeatlh = (legacy as any).certificateHealth
                delete (legacy as any).certificateHealth
            }

            return response.status(201).json({
                employee: legacy,
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
        const { employeeUpdateValidator } = await import('#validators/employee')
        const payload = await request.validateUsing(employeeUpdateValidator)
        try {
            // Nested collections are arrays of objects now
            const hasScheduleWork = (payload as any).scheduleWork !== undefined
            const hasCertificateHealth = (payload as any).certificateHealth !== undefined
            const hasContactsEmergency = (payload as any).contactsEmergency !== undefined
            const scheduleWorkRaw: Record<string, any>[] = hasScheduleWork && Array.isArray((payload as any).scheduleWork) ? (payload as any).scheduleWork : []
            const certificateHealthRaw: Record<string, any>[] = hasCertificateHealth && Array.isArray((payload as any).certificateHealth) ? (payload as any).certificateHealth : []
            const contactsEmergencyRaw: Record<string, any>[] = hasContactsEmergency && Array.isArray((payload as any).contactsEmergency) ? (payload as any).contactsEmergency : []
            const employee = await Employee.find(employeeId)
            if (!employee) return response.status(404).json(MessageFrontEnd(i18n.formatMessage('messages.data_not_found'), i18n.formatMessage('messages.error_title')))

            // Build conditional patch for employee fields to avoid nulling omitted values
            const employeePatch: any = {
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            }
            if (payload.typeIdentifyId !== undefined) employeePatch.identifyTypeId = payload.typeIdentifyId
            if (payload.identify !== undefined) employeePatch.identify = payload.identify
            if (payload.names !== undefined) employeePatch.names = payload.names
            if (payload.lastNameP !== undefined) employeePatch.lastNameP = payload.lastNameP
            if (payload.lastNameM !== undefined) employeePatch.lastNameM = payload.lastNameM
            if (payload.stateCivil !== undefined) employeePatch.stateCivilId = payload.stateCivil
            if (payload.sexId !== undefined) employeePatch.sexId = payload.sexId
            if (payload.birthDate !== undefined) employeePatch.birthDate = payload.birthDate ? DateTime.fromISO(payload.birthDate) : null
            if (payload.nationalityId !== undefined) employeePatch.nationalityId = payload.nationalityId
            if (payload.cityId !== undefined) employeePatch.cityId = payload.cityId
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
                .where('business_id', payload.businessId)
                .where('employee_id', employeeId)
                .first()

            if (businessEmployee) {
                const patch: any = { updatedAt: dateTime }
                if (payload.afpId !== undefined) patch.afpId = payload.afpId
                if (payload.afpPercentage !== undefined) patch.afpPercentage = payload.afpPercentage
                if (payload.exRegimeId !== undefined) patch.exRegimeId = payload.exRegimeId
                if (payload.afp2Id !== undefined) patch.afp2Id = payload.afp2Id
                if (payload.afp2Ahorro !== undefined) patch.afp2Ahorro = payload.afp2Ahorro
                if (payload.coinAhorroId !== undefined) patch.coinAhorroId = payload.coinAhorroId
                if (payload.typeContractId !== undefined) patch.typeContractId = payload.typeContractId
                if (payload.affiliationId !== undefined) patch.affiliationId = payload.affiliationId
                if (payload.layoffId !== undefined) patch.layoffId = payload.layoffId
                if (payload.isapreId !== undefined) patch.isapreId = payload.isapreId
                if (payload.loadFamilyId !== undefined) patch.loadFamilyId = payload.loadFamilyId
                if (payload.loadFamilyNormal !== undefined) patch.loadFamilyNormal = payload.loadFamilyNormal
                if (payload.loadFamilyInvalidate !== undefined) patch.loadFamilyInvalidate = payload.loadFamilyInvalidate
                if (payload.weeklyShiftHours !== undefined) patch.weeklyShiftHours = payload.weeklyShiftHours
                if (payload.viewLiquidation !== undefined) patch.viewLiquidation = payload.viewLiquidation
                if (payload.healthPactValue !== undefined) patch.healthPactValue = payload.healthPactValue
                if (payload.healthPactCoinId !== undefined) patch.healthPactCoinId = payload.healthPactCoinId
                if (payload.mountPact !== undefined) patch.mountPact = payload.mountPact
                if (payload.additionalPact !== undefined) patch.additionalPact = payload.additionalPact
                if (payload.remunerationTypeId !== undefined) patch.remunerationTypeId = payload.remunerationTypeId
                if (payload.remunerationAmount !== undefined) patch.remunerationAmount = payload.remunerationAmount
                if (payload.legalGratificationId !== undefined) patch.legalGratificationId = payload.legalGratificationId
                if (payload.bankId !== undefined) patch.bankId = payload.bankId
                if (payload.typeAccountId !== undefined) patch.typeAccountId = payload.typeAccountId
                if (payload.nroAccount !== undefined) patch.nroAccount = payload.nroAccount
                if (payload.owner !== undefined) patch.owner = payload.owner
                if (payload.zoneBonus !== undefined) patch.zoneBonus = payload.zoneBonus
                if (payload.snacksBonus !== undefined) patch.snacksBonus = payload.snacksBonus
                if (payload.mobilizationsBonus !== undefined) patch.mobilizationsBonus = payload.mobilizationsBonus
                if (payload.businessSalaryId !== undefined) patch.businessSalaryId = payload.businessSalaryId
                if (payload.quoteSis !== undefined) patch.quoteSis = payload.quoteSis
                if (payload.costCenterId !== undefined) patch.costCenterId = payload.costCenterId
                if (payload.positionId !== undefined) patch.positionId = payload.positionId
                if (payload.admissionDate !== undefined) patch.admissionDate = payload.admissionDate ? DateTime.fromISO(payload.admissionDate) : null
                if (payload.contractDate !== undefined) patch.contractDate = payload.contractDate ? DateTime.fromISO(payload.contractDate) : null
                if (payload.settlementDate !== undefined) patch.settlementDate = payload.settlementDate ? DateTime.fromISO(payload.settlementDate) : null
                businessEmployee.merge(patch)
                await businessEmployee.useTransaction(trx).save()
            }

            // Replace nested relationships if provided
            const businessId = payload.businessId
            if (hasCertificateHealth) {
                await employee.useTransaction(trx).related('certificateHealth').query().delete()
                const certs: Array<{ healthItemId: number }> = []
                for (const c of certificateHealthRaw) {
                    const healthItemId = c.healthItemId
                    if (!healthItemId) continue
                    certs.push({ healthItemId: Number(healthItemId) })
                }
                if (certs.length) {
                    await employee.related('certificateHealth').createMany(certs, { client: trx })
                }
            }

            if (hasContactsEmergency) {
                await employee.useTransaction(trx).related('emergencyContacts').query().delete()
                const contacts: Array<{ fullName: string; phone1: string; phone2: string | null; relationshipId: number; createdById?: number; updatedById?: number }> = []
                for (const c of contactsEmergencyRaw) {
                    const fullName = c.fullName ?? c.name
                    const phone1 = c.phone1 ?? c.phone
                    const phone2 = c.phone2 ?? null
                    const relationshipId = c.relationshipId ?? c.relationId
                    if (!fullName || !phone1 || !relationshipId) continue
                    contacts.push({
                        fullName: String(fullName),
                        phone1: String(phone1),
                        phone2: phone2 ? String(phone2) : null,
                        relationshipId: Number(relationshipId),
                        createdById: auth.user!.id,
                        updatedById: auth.user!.id,
                    })
                }
                if (contacts.length) {
                    await employee.related('emergencyContacts').createMany(contacts as any, { client: trx })
                }
            }

            if (hasScheduleWork) {
                await employee.useTransaction(trx).related('scheduleWork').query().delete()
                const normalizedScheduleWork: Array<{ workId: number; scheduleId: number; businessId: number; art22: boolean }> = []
                for (const item of scheduleWorkRaw) {
                    const workId = item.workId ?? item.work_id
                    const scheduleId = item.scheduleId ?? item.schedule_id
                    const art22 = item.art22 === undefined ? false : Boolean(item.art22)
                    if (!workId || !scheduleId) continue
                    normalizedScheduleWork.push({
                        workId: Number(workId),
                        scheduleId: Number(scheduleId),
                        businessId: Number(businessId),
                        art22,
                    })
                }
                if (normalizedScheduleWork.length) {
                    await employee.related('scheduleWork').createMany(normalizedScheduleWork as any, { client: trx })
                }
            }

            await employee.load('business')
            await employee.load('certificateHealth')
            await employee.load('emergencyContacts')
            await employee.load('city', (b) => {
                b.select(['id', 'name', 'country_id'])
                b.preload('country', (cb) => cb.select(['id', 'name']))
            })
            await employee.load('scheduleWork', (b) => {
                b.preload('schedule')
                b.preload('work')
            })

            const legacy = this.toLegacyEmployee(employee.toJSON())
            if ((legacy as any).certificateHeatlh === undefined && (legacy as any).certificateHealth !== undefined) {
                ; (legacy as any).certificateHeatlh = (legacy as any).certificateHealth
                delete (legacy as any).certificateHealth
            }

            await trx.commit()
            return response.status(200).json({ ...MessageFrontEnd(i18n.formatMessage('messages.update_ok'), i18n.formatMessage('messages.ok_title')), data: legacy })
        } catch (error) {
            await trx.rollback()
            console.error(error)
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.update_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    /** Show employee by token + business context (legacy-shaped response) */
    public async show({ params }: HttpContext) {
        const token = params.token
        const businessId = Number(params.business_id)
        const employee = await Employee.query()
            .where('token', token)
            .preload('typeIdentify', (b) => b.select(['id', 'text']))
            .preload('city', (b) => {
                b.select(['id', 'name', 'country_id'])
                b.preload('country', (cb) => cb.select(['id', 'name']))
            })
            .preload('nationality', (b) => b.select(['id', 'name']))
            .preload('sexes', (b) => b.select(['id', 'text']))
            .preload('business', (b) => {
                b.where('business_id', businessId)
                b.where('enabled', true)
                b.preload('afp', (bb) => bb.select(['id', 'name']))
                b.preload('position', (bb) => bb.select(['id', 'name']))
            })
            .preload('certificateHealth')
            .preload('emergencyContacts')
            .preload('scheduleWork', (b) => {
                b.preload('schedule')
                b.preload('work')
            })
            .first()

        if (!employee) return null
        return this.toLegacyEmployee(employee.toJSON())
    }

    /** Find employees by identify (uniform formatting, no 500 on empty) */
    public async findByIdentify({ request, response }: HttpContext) {
        const { identify, typeIdentify, businessId } = await request.validateUsing(employeeFindByIdentifyValidator)
        const rows = await Employee.query()
            .where('identify', String(identify).trim())
            .where('identify_type_id', typeIdentify)
            .select(['id', 'identify_type_id', 'identify', 'names', 'last_name_p', 'last_name_m', 'birth_date'])
            .preload('business', (b) => {
                b.where('business_id', businessId)
                b.select(['id', 'enabled', 'employee_id', 'business_id'])
            })
            .preload('city', (b) => {
                b.select(['id', 'name', 'country_id'])
                b.preload('country', (cb) => cb.select(['id', 'name']))
            })
            .preload('typeIdentify', (b) => b.select(['id', 'text']))
            .preload('certificateHealth')
            .preload('emergencyContacts')
            .preload('scheduleWork', (b) => {
                b.preload('schedule')
                b.preload('work')
            })

        const list = rows.map((e) => this.mapSearchEmployee(e.toJSON()))
        return response.ok(list)
    }

    public async findById({ response, request }: HttpContext) {
        const { employeeId, businessId } = await request.validateUsing(employeeFindByIdValidator)
        const employee = await Employee.query()
            .where('id', employeeId)
            .preload('city', (b) => {
                b.select(['id', 'name', 'country_id'])
                b.preload('country', (cb) => cb.select(['id', 'name']))
            })
            .preload('business', (b) => {
                b.where('business_id', businessId)
                b.orderBy('id', 'desc')
            })
            .preload('certificateHealth')
            .preload('emergencyContacts')
            .preload('scheduleWork', (b) => {
                b.preload('schedule')
                b.preload('work')
            })
            .first()

        if (!employee) return response.ok(null)
        const legacy = this.toLegacyEmployee(employee.toJSON())
        return response.ok(legacy)
    }

    public async findByName({ request, response }: HttpContext) {
        const { name, businessId } = await request.validateUsing(employeeFindByNameValidator)
        const employees = await EmployeeRepository.findByName(businessId, name)
        if (!employees || !employees.length) return response.ok([])
        for (const e of employees) {
            e.typeIdentify = { id: e.identify_type_id, text: e.text }
            if (e.birth_date) {
                const dt = DateTime.fromISO(e.birth_date)
                if (dt.isValid) {
                    ; (e as any).birth_date_format = dt.toFormat('yyyy-LL-dd')
                    e.birth_date = dt.toFormat('dd/MM/yyyy') as any
                        ; (e as any).age = Math.trunc(DateTime.now().diff(dt, 'years').years)
                } else {
                    ; (e as any).birth_date_format = null
                        ; (e as any).age = null
                }
            } else {
                ; (e as any).birth_date_format = null
                    ; (e as any).age = null
            }
            if ((e as any).city && (e as any).city.country && (e as any).city.country.id && (e as any).city.country_id === undefined) {
                (e as any).city.country_id = (e as any).city.country.id
            }
            if ((e as any).full_name) delete (e as any).full_name
        }
        return response.ok(employees)
    }

    public async findByLastNameP({ request, response }: HttpContext) {
        const { lastNameP, businessId } = await request.validateUsing(employeeFindByLastNamePValidator)
        const employees = await EmployeeRepository.findByLastNameP(businessId, lastNameP)
        for (const e of employees) {
            e.typeIdentify = { id: e.identify_type_id, text: e.text }
            if (e.birth_date) {
                const dt = DateTime.fromISO(e.birth_date)
                if (dt.isValid) {
                    ; (e as any).birth_date_format = dt.toFormat('yyyy-LL-dd')
                    e.birth_date = dt.toFormat('dd/MM/yyyy') as any
                        ; (e as any).age = Math.trunc(DateTime.now().diff(dt, 'years').years)
                } else {
                    ; (e as any).birth_date_format = null
                        ; (e as any).age = null
                }
            } else {
                ; (e as any).birth_date_format = null
                    ; (e as any).age = null
            }
            if ((e as any).city && (e as any).city.country && (e as any).city.country.id && (e as any).city.country_id === undefined) {
                (e as any).city.country_id = (e as any).city.country.id
            }
            if ((e as any).full_name) delete (e as any).full_name
        }
        return response.ok(employees || [])
    }

    public async deletePhoto({ request, response, i18n }: HttpContext) {
        const { employeeId } = await request.validateUsing(employeeDeletePhotoValidator)
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
        const { condition, expireDate, costCenter, businessId } = await request.validateUsing(employeeReportValidator)
        const report = await EmployeeRepository.report(condition, expireDate ?? null, costCenter ?? null, businessId)
        return report.map((r) => ({
            token: r.token,
            nombre: r.names,
            identificacion: `${r.type_identify} ${r.identify}`,
            apellidos: `${r.last_name_p} ${r.last_name_m}`,
            estado: r.enabled ? 'Activo' : 'Inactivo',
        }))
    }

    public async inactive({ request, auth, response, i18n }: HttpContext) {
        const { businessEmployeeId } = await request.validateUsing(employeeBusinessEmployeeIdValidator)
        if (typeof businessEmployeeId !== 'number' || businessEmployeeId <= 0) {
            return response.status(422).json(MessageFrontEnd(i18n.formatMessage('messages.validation_error'), i18n.formatMessage('messages.error_title')))
        }
        const dateTime = await Util.getDateTimes(request.ip())
        try {
            const businessEmployee = await BusinessEmployee.find(businessEmployeeId)
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
        const { businessEmployeeId } = await request.validateUsing(employeeBusinessEmployeeIdValidator)
        if (typeof businessEmployeeId !== 'number' || businessEmployeeId <= 0) {
            return response.status(422).json(MessageFrontEnd(i18n.formatMessage('messages.validation_error'), i18n.formatMessage('messages.error_title')))
        }
        try {
            const businessEmployee = await BusinessEmployee.find(businessEmployeeId)
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
        const { employeeId, businessId } = await request.validateUsing(employeeFindWorkPermitsValidator)
        const permits = await EmployeePermit.query().where('employee_id', employeeId).where('business_id', businessId).orderBy('id', 'desc')
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
        const { type, dateStart, dateEnd, reason, employeeId, businessId, authorizerId } = await request.validateUsing(employeePermitStoreValidator)

        try {
            const permit = await EmployeePermit.create({
                type,
                date_start: dateStart,
                date_end: dateEnd,
                reason,
                employee_id: employeeId,
                business_id: businessId,
                authorizer_id: authorizerId,
                authorized: false,
                created_at: dateTime,
                updated_at: dateTime,
                created_by: auth.user!.id,
                updated_by: auth.user!.id,
            } as any)

            const employee = await Employee.find(employeeId)
            const authorizer = await User.find(authorizerId)
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
        const { permitId } = await request.validateUsing(employeePermitIdValidator)
        const dateTime = await Util.getDateTimes(request.ip())
        const permit = await EmployeePermit.find(permitId)
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
        const { permitId } = await request.validateUsing(employeePermitIdValidator)
        const dateTime = await Util.getDateTimes(request.ip())
        const permit = await EmployeePermit.find(permitId)
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
        const { employeeId, businessId } = await request.validateUsing(employeeFindLicensesHealthValidator)
        const rows = await EmployeeLicenseHealth.query().where('employee_id', employeeId).where('business_id', businessId).orderBy('id', 'desc').preload('typeLicense')
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
        let { condition, workId, dateStart, dateEnd } = await request.validateUsing(employeeFindAccessValidator)
        const dateTime = await Util.getDateTimes(request.ip())
        if (condition === 1) {
            dateStart = dateTime.toFormat('yyyy-LL-dd')
            dateEnd = dateStart
        } else if (condition === 2) {
            const prev = dateTime.minus({ days: 1 })
            dateStart = prev.toFormat('yyyy-LL-dd')
            dateEnd = dateStart
        } else if (condition === 3) {
            dateStart = dateTime.startOf('month').toFormat('yyyy-LL-dd')
            dateEnd = dateTime.endOf('month').toFormat('yyyy-LL-dd')
        }
        if (workId && workId > 0) {
            const ds = dateStart ?? dateTime.toFormat('yyyy-LL-dd')
            const de = dateEnd ?? ds
            return EmployeeAccessRepository.findAccessByWorkId(workId, ds, de)
        }
        return []
    }

    public async findAccessByEmployeeId({ request }: HttpContext) {
        let { employeeId, condition, dateStart, dateEnd } = await request.validateUsing(employeeFindAccessByEmployeeIdValidator)
        const dateTime = await Util.getDateTimes(request.ip())
        if (condition === 1) {
            dateStart = dateTime.toFormat('yyyy-LL-dd')
            dateEnd = dateStart
        } else if (condition === 2) {
            const prev = dateTime.minus({ days: 1 })
            dateStart = prev.toFormat('yyyy-LL-dd')
            dateEnd = dateStart
        } else if (condition === 3) {
            dateStart = dateTime.startOf('month').toFormat('yyyy-LL-dd')
            dateEnd = dateTime.endOf('month').toFormat('yyyy-LL-dd')
        }
        const ds = dateStart ?? dateTime.toFormat('yyyy-LL-dd')
        const de = dateEnd ?? ds
        const access = await EmployeeAccessRepository.findAccessByEmployeeId(employeeId, ds, de)
        const grouped = groupBy(access, ['date'])
        return grouped
    }
}
