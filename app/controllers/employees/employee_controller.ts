import BusinessEmployee from '#models/business/business_employee'
import Employee from '#models/employees/employee'
import EmployeeLicenseHealth from '#models/employees/employee_license_health'
import EmployeePermit from '#models/employees/employee_permit'
import PersonalData from '#models/users/personal_data'
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
    return arr.reduce((acc: any, item) => {
        const composite = keys.map(k => item[k]).join('__')
        if (!acc[composite]) acc[composite] = []
        acc[composite].push(item)
        return acc
    }, {})
}

// NOTE: Implemented GCS image handling (photo & authorization) using Google util.

// Typed shapes for Employee License Health endpoints
type ISODateString = string
interface EmployeeLicenseHealthBaseInput {
    employeeId: number
    typeLicenseId: number
    status?: string | null
    folio?: string | null
    motiveId?: number | null
    workActivityId?: number | null
    occupationId?: number | null
    dateStatus?: ISODateString | null
    dateEndRelation?: ISODateString | null
    dateDisposition?: ISODateString | null
    licenseLastSixMonth?: boolean | number | string | null
    paymentEntityId?: number | null
    businessDate?: ISODateString | null
    businessComuna?: string | null
    compensationBoxId?: number | null
    mutualId?: number | null
    other?: string | null
    employeeAge?: number | null
    sonBirthDate?: ISODateString | null
    sonLastNameP?: string | null
    sonLastNameM?: string | null
    sonNames?: string | null
    sonTypeIdentifyId?: number | null
    sonIdentify?: string | null
    reposeSite?: string | null
    reposeAddress?: string | null
    reposePhone?: string | null
    reposeEmail?: string | null
    enabled?: boolean
}

type EmployeeLicenseHealthStoreBody = EmployeeLicenseHealthBaseInput & { bussinesId: number }
type EmployeeLicenseHealthUpdateBody = Partial<EmployeeLicenseHealthBaseInput> & { bussinesId?: number }

export default class EmployeeController {
    // Date parsing helpers (accept ISO string or JS Date)
    private toDt(value?: Date | string | null
    ): DateTime | null {
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

    private fmtDateTime(value?: Date | string): string | null {
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
        // Normalize settings-based relations that use 'text' internally to legacy 'name'
        if (item.legalGratification && item.legalGratification.text && item.legalGratification.name === undefined) {
            item.legalGratification.name = item.legalGratification.text
        }
        if (item.businessSalary && item.businessSalary.text && item.businessSalary.name === undefined) {
            item.businessSalary.name = item.businessSalary.text
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

    /*     // Helper for search endpoints (lightweight mapping)
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
    
        // Row type returned by raw repository search queries
        private mapRepoEmployeeSearch(row: {
            id: number
            business_id: number
            enabled: boolean | 0 | 1
            identify_type_id: number
            identify: string
            names: string
            last_name_p: string
            last_name_m: string
            photo?: string | null
            thumb?: string | null
            token?: string | null
            text: string
            birth_date?: string | Date | null
            city_id?: number | null
            city_name?: string | null
            city_country_id?: number | null
            country_id?: number | null
            country_name?: string | null
            [k: string]: unknown
        }) {
            const out: any = { ...row }
            // Build typed identify object expected by clients
            out.typeIdentify = { id: row.identify_type_id, text: row.text }
    
            // Date normalization: prefer birth_date, fallback to birth_day
            const dt = this.toDt(row.birth_date)
            if (dt) {
                out.birth_date_format = dt.toFormat('yyyy-LL-dd')
                out.birth_date = dt.toFormat('dd/MM/yyyy')
                out.age = Math.trunc(DateTime.now().diff(dt, 'years').years)
            } else {
                out.birth_date_format = null
                out.age = null
            }
    
            // Compose city object if pieces are present
            if (row.city_id || row.city_name || row.city_country_id) {
                out.city = {
                    id: row.city_id ?? null,
                    name: row.city_name ?? null,
                    country_id: row.city_country_id ?? null,
                    country: row.country_id || row.country_name
                        ? { id: row.country_id ?? null, name: row.country_name ?? null }
                        : undefined,
                }
            }
            // Legacy cleanup
            if (out.full_name) delete out.full_name
            return out
        } */
    /** Create a new employee with related business link and nested collections */
    public async store({ request, response, auth, i18n }: HttpContext) {
        const { employeeStoreValidator } = await import('#validators/employee')
        const payload = await request.validateUsing(employeeStoreValidator)
        const { userId, personalData } = payload
        // Note: timestamps are auto-managed by the model; we only compute dates for normalization when needed
        const trx = await db.transaction()
        const createdFiles: string[] = []
        const authUserId = auth.user!.id

        try {
            // Nested collections are now arrays of objects (validator updated)
            const scheduleWork: Record<string, any>[] = Array.isArray(payload.scheduleWork) ? payload.scheduleWork : []
            const certificateHealthRaw: Record<string, any>[] = Array.isArray(payload.certificateHealth) ? payload.certificateHealth : []
            const contactsEmergencyRaw: Record<string, any>[] = Array.isArray(payload.contactsEmergency) ? payload.contactsEmergency : []

            const currentTime = await Util.getDateTimes(request.ip())
            // Debug: nested collections received (disabled in production)

            const authorization = request.file('authorization')

            const employeeData: any = {
                /*                 identifyTypeId: payload.typeIdentifyId,
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
                                email: payload.email, */
                createdById: authUserId,
                updatedById: authUserId,
                createdAt: currentTime,
                updatedAt: currentTime,
            }



            const businessEmployeeData: any = {
                enabled: payload.enabled || false,
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
                createdAt: currentTime,
                updatedAt: currentTime,
                createdById: authUserId,
                updatedById: authUserId,
            }

            // Upload images if present
            if (authorization) {
                const uploadedA = await Google.uploadFile(authorization, 'admin/authorizations')
                Object.assign(employeeData, {
                    authorization_mirror: uploadedA.url,
                    authorization_mirror_short: uploadedA.url_short,
                    thumb_authorization_mirror: uploadedA.url_thumb,
                    thumb_authorization_mirror_short: uploadedA.url_thumb_short,
                })
                if (uploadedA.url_short) createdFiles.push(uploadedA.url_short)
            }
            // Link or create personalData
            if (userId) {
                const user = await User.findOrFail(userId)
                if (!user.personalDataId) {
                    await trx.rollback()
                    return response.status(422).json(MessageFrontEnd(i18n.formatMessage('messages.user_missing_personal_data'), i18n.formatMessage('messages.error_title')))
                }
                employeeData.personalDataId = user.personalDataId
            } else if (personalData) {
                let imageData: Record<string, any> = {}
                const { photo, ...pdData } = personalData
                let createdFile: string | null = null
                try {
                    if (photo) {
                        const uploaded = await Google.uploadFile(photo, 'personal_data', 'image')
                        imageData = {
                            photo: uploaded.url,
                            thumb: uploaded.url_thumb,
                            photoShort: uploaded.url_short,
                            thumbShort: uploaded.url_thumb_short,
                        }
                        createdFile = uploaded.url_short
                    }
                    const payloadPersonalData = {
                        ...pdData,
                        ...imageData,
                        birthDate: pdData.birthDate ? DateTime.fromJSDate(pdData.birthDate) : null,
                        phone: pdData.phone ?? null,
                        createdAt: currentTime,
                        updatedAt: currentTime,
                        createdBy: auth.user!.id,
                        updatedBy: auth.user!.id,
                    }
                    const newPd = await PersonalData.create(payloadPersonalData, { client: trx })
                    employeeData.personalDataId = newPd.id
                    if (createdFile) createdFiles.push(createdFile)
                } catch (e) {
                    if (createdFile) { try { await Google.deleteFile(createdFile) } catch { } }
                    throw e
                }
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
            await employee.load('business', (b) => {
                b.preload('afp', (bb) => bb.select(['id', 'name']))
                b.preload('afp2', (bb) => bb.select(['id', 'name']))
                b.preload('exRegime', (bb) => bb.select(['id', 'name']))
                b.preload('typeContract', (bb) => bb.select(['id', 'name']))
                b.preload('affiliation', (bb) => bb.select(['id', 'name']))
                b.preload('layoff', (bb) => bb.select(['id', 'name']))
                b.preload('isapre', (bb) => bb.select(['id', 'name']))
                b.preload('loadFamily', (bb) => bb.select(['id', 'name']))
                b.preload('remunerationType', (bb) => bb.select(['id', 'text']))
                b.preload('legalGratification', (bb) => bb.select(['id', 'text']))
                b.preload('bank', (bb) => bb.select(['id', 'text']))
                b.preload('typeAccount', (bb) => bb.select(['id', 'text']))
                b.preload('costCenter', (bb) => bb.select(['id', 'name']))
                b.preload('ahorroCoin', (bb) => bb.select(['id', 'symbol', 'name']))
                b.preload('healthPactCoin', (bb) => bb.select(['id', 'symbol', 'name']))
                b.preload('inactiveByUser', (bb) => {
                    bb.preload('personalData', (pd) => pd.select('names', 'last_name_p', 'last_name_m'))
                    bb.select(['id', 'personal_data_id', 'email'])
                })
                b.preload('position', (bb) => bb.select(['id', 'name']))
                b.preload('businessSalary', (bb) => bb.select(['id', 'text']))
                b.preload('business', (bb) => {
                    bb.select(['id', 'type_identify_id', 'identify', 'name', 'url', 'url_thumb'])
                    bb.preload('typeIdentify', (ti) => ti.select(['id', 'text']))
                })
            })
            // Replaced legacy direct relations with personalData preload
            await employee.load('personalData')
            await employee.load('certificateHealth')
            await employee.load('emergencyContacts', (b) => {
                b.preload('relationship', (rb) => rb.select(['id', 'country_id', 'key_id', 'text', 'value', 'enabled', 'created_by', 'updated_by', 'created_at', 'updated_at']))
            })
            // City & country now accessible via personalData if needed
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
            if (createdFiles.length) { try { await Promise.all(createdFiles.map(f => Google.deleteFile(f))) } catch { } }
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.store_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    /** Update base employee and business specific data */
    public async update({ request, params, auth, i18n, response }: HttpContext) {
        const employeeId = Number(params.id)
        const currentTime = (await Util.getDateTimes(request.ip())).toISO()
        const trx = await db.transaction()
        const { employeeUpdateValidator } = await import('#validators/employee')
        const payload = await request.validateUsing(employeeUpdateValidator)
        const { userId, personalData } = payload as any
        const createdFiles: string[] = []
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
                updatedAt: currentTime,
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
                if (uploadedA.url_short) createdFiles.push(uploadedA.url_short)
            }

            // Handle personalData linking/creation/update
            if (userId) {
                const user = await User.findOrFail(userId)
                if (!user.personalDataId) {
                    await trx.rollback()
                    return response.status(422).json(MessageFrontEnd(i18n.formatMessage('messages.user_missing_personal_data'), i18n.formatMessage('messages.error_title')))
                }
                employeePatch.personalDataId = user.personalDataId
            } else if (personalData) {
                let imageData: Record<string, any> = {}
                const { photo, ...pdData } = personalData
                let createdFile: string | null = null
                try {
                    if (photo) {
                        const uploaded = await Google.uploadFile(photo, 'personal_data', 'image')
                        imageData = {
                            photo: uploaded.url,
                            thumb: uploaded.url_thumb,
                            photoShort: uploaded.url_short,
                            thumbShort: uploaded.url_thumb_short,
                        }
                        createdFile = uploaded.url_short
                    }
                    if (employee.personalDataId) {
                        const existingPd = await PersonalData.find(employee.personalDataId)
                        if (existingPd) {
                            existingPd.merge({
                                ...pdData,
                                ...imageData,
                                birthDate: DateTime.fromJSDate(pdData.birthDate),
                                phone: pdData.phone ?? null,
                                updatedAt: currentTime,
                                updatedBy: auth.user!.id,
                            })
                            await existingPd.save()
                        }
                    } else {
                        const payloadPersonalData = {
                            ...pdData,
                            ...imageData,
                            birthDate: DateTime.fromJSDate(pdData.birthDate),
                            phone: pdData.phone ?? null,
                            createdAt: currentTime,
                            updatedAt: currentTime,
                            createdBy: auth.user!.id,
                            updatedBy: auth.user!.id,
                        }
                        const newPd = await PersonalData.create(payloadPersonalData)
                        employeePatch.personalDataId = newPd.id
                    }
                    if (createdFile) createdFiles.push(createdFile)
                } catch (e) {
                    if (createdFile) { try { await Google.deleteFile(createdFile) } catch { } }
                    throw e
                }
            }

            // Merge patch after potential file operations (we still call merge before save)
            employee.merge(employeePatch)
            await employee.useTransaction(trx).save()

            const businessEmployee = await BusinessEmployee.query({ client: trx })
                .where('business_id', payload.businessId)
                .where('employee_id', employeeId)
                .first()

            if (businessEmployee) {
                const patch: any = { updatedAt: currentTime }
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
                if (payload.enabled !== undefined) patch.enabled = payload.enabled
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

            await employee.load('business', (b) => {
                b.preload('afp', (bb) => bb.select(['id', 'name']))
                b.preload('afp2', (bb) => bb.select(['id', 'name']))
                b.preload('exRegime', (bb) => bb.select(['id', 'name']))
                b.preload('typeContract', (bb) => bb.select(['id', 'name']))
                b.preload('affiliation', (bb) => bb.select(['id', 'name']))
                b.preload('layoff', (bb) => bb.select(['id', 'name']))
                b.preload('isapre', (bb) => bb.select(['id', 'name']))
                b.preload('loadFamily', (bb) => bb.select(['id', 'name']))
                b.preload('remunerationType', (bb) => bb.select(['id', 'text']))
                b.preload('legalGratification', (bb) => bb.select(['id', 'text']))
                b.preload('bank', (bb) => bb.select(['id', 'text']))
                b.preload('typeAccount', (bb) => bb.select(['id', 'text']))
                b.preload('costCenter', (bb) => bb.select(['id', 'name']))
                b.preload('ahorroCoin', (bb) => bb.select(['id', 'symbol', 'name']))
                b.preload('healthPactCoin', (bb) => bb.select(['id', 'symbol', 'name']))
                b.preload('inactiveByUser', (bb) => {
                    bb.preload('personalData', (pd) => pd.select('names', 'last_name_p', 'last_name_m'))
                    bb.select(['id', 'personal_data_id', 'email'])
                })
                b.preload('position', (bb) => bb.select(['id', 'name']))
                b.preload('businessSalary', (bb) => bb.select(['id', 'text']))
                b.preload('business', (bb) => {
                    bb.select(['id', 'type_identify_id', 'identify', 'name', 'url', 'url_thumb'])
                    bb.preload('typeIdentify', (ti) => ti.select(['id', 'text']))
                })
            })
            await employee.load('personalData', (pd) => {
                pd.select([
                    'id', 'names', 'last_name_p', 'last_name_m', 'type_identify_id', 'identify',
                    'state_civil_id', 'sex_id', 'birth_date', 'nationality_id', 'city_id',
                    'address', 'phone', 'movil', 'email', 'photo', 'thumb', 'photo_short', 'thumb_short'
                ])
                    .preload('typeIdentify', (ti) => ti.select(['id', 'text']))
                    .preload('city', (cityQ) => cityQ.select(['id', 'name', 'country_id']).preload('country', (co) => co.select(['id', 'name'])))
                    .preload('nationality', (natQ) => natQ.select(['id', 'name', 'nationality']))
                    .preload('stateCivil', (scQ) => scQ.select(['id', 'text']))
                    .preload('sex', (sexQ) => sexQ.select(['id', 'text']))
            })
            await employee.load('certificateHealth')
            await employee.load('emergencyContacts', (b) => {
                b.preload('relationship', (rb) => rb.select(['id', 'country_id', 'key_id', 'text', 'value', 'enabled', 'created_by', 'updated_by', 'created_at', 'updated_at']))
            })
            // City & country now accessible via personalData if needed
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
            if (createdFiles.length) { try { await Promise.all(createdFiles.map(f => Google.deleteFile(f))) } catch { } }
            return response.status(500).json(MessageFrontEnd(i18n.formatMessage('messages.update_error'), i18n.formatMessage('messages.error_title')))
        }
    }

    /** Show employee by token + business context (legacy-shaped response) */
    public async show({ params }: HttpContext) {
        const token = params.token
        const businessId = Number(params.business_id)
        const employee = await Employee.query()
            .where('token', token)
            .preload('personalData', (pd) => {
                pd.select(['id', 'names', 'last_name_p', 'last_name_m', 'identify', 'type_identify_id', 'city_id', 'nationality_id', 'state_civil_id', 'sex_id'])
                    .preload('typeIdentify', (ti) => ti.select(['id', 'text']))
                    .preload('city', (cityQ) => {
                        cityQ.select(['id', 'name', 'country_id']).preload('country', (co) => co.select(['id', 'name']))
                    })
                    .preload('nationality', (natQ) => natQ.select(['id', 'name', 'nationality']))
                    .preload('stateCivil', (scQ) => scQ.select(['id', 'text']))
                    .preload('sex', (sexQ) => sexQ.select(['id', 'text']))
            })
            .preload('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            .preload('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            .preload('business', (b) => {
                b.where('business_id', businessId)
                    .where('enabled', true)
                    .preload('afp', (bb) => bb.select(['id', 'name']))
                    .preload('afp2')
                    .preload('business')
                    .preload('exRegime')
                    .preload('typeContract')
                    .preload('affiliation')
                    .preload('layoff')
                    .preload('isapre')
                    .preload('loadFamily')
                    .preload('remunerationType')
                    .preload('legalGratification')
                    .preload('bank')
                    .preload('typeAccount')
                    .preload('costCenter')
                    .preload('ahorroCoin')
                    .preload('healthPactCoin')
                    .preload('inactiveByUser', (bb) => {
                        bb.preload('personalData', (pd) => pd.select('names', 'last_name_p', 'last_name_m'))
                        bb.select(['id', 'personal_data_id', 'email'])
                    })
                    .preload('position')
            })
            .preload('certificateHealth', cHQ => cHQ.preload('item'))
            .preload('emergencyContacts', q => q.preload('relationship'))
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
        const employee = await Employee.query()
            .whereHas('personalData', (pdQ) => {
                pdQ.where('identify', String(identify).trim())
                    .where('type_identify_id', typeIdentify)
            })
            .preload('business', (b) => {
                b.where('business_id', businessId)
                b.select(['id', 'enabled', 'employee_id', 'business_id'])
            })
            .preload('personalData', (pd) => {
                pd.preload('typeIdentify', (ti) => ti.select(['id', 'text']))
                // .preload('city', (cityQ) => cityQ.select(['id', 'name', 'country_id']).preload('country', (co) => co.select(['id', 'name'])))
                // .preload('nationality', (natQ) => natQ.select(['id', 'name', 'nationality']))
                // .preload('stateCivil', (scQ) => scQ.select(['id', 'text']))
                // .preload('sex', (sexQ) => sexQ.select(['id', 'text']))
            })
            .first()
        return response.ok(employee)
    }

    public async findById({ response, request }: HttpContext) {
        const { employeeId, businessId } = await request.validateUsing(employeeFindByIdValidator)
        const employee = await Employee.query()
            .where('id', employeeId)
            .preload('personalData', (pd) => {
                pd
                    .preload('typeIdentify', (ti) => ti.select(['id', 'text']))
                    .preload('city', (cityQ) => cityQ.select(['id', 'name', 'country_id']).preload('country', (co) => co.select(['id', 'name'])))
                    .preload('nationality', (natQ) => natQ.select(['id', 'name', 'nationality']))
                    .preload('stateCivil', (scQ) => scQ.select(['id', 'text']))
                    .preload('sex', (sexQ) => sexQ.select(['id', 'text']))
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
        const { name } = await request.validateUsing(employeeFindByNameValidator)
        const employees = await Employee.query()
            .whereHas('personalData', (pdQ) => {
                pdQ.where('names', 'like', `%${name}%`)
            })
            .preload('personalData', (pd) => {
                pd.preload('typeIdentify', (ti) => ti.select(['id', 'text']))
            })

        response.ok(employees)
    }

    public async findByLastNameP({ request, response }: HttpContext) {
        const { lastNameP } = await request.validateUsing(employeeFindByLastNamePValidator)
        const employees = await Employee.query()
            .whereHas('personalData', (pdQ) => {
                pdQ.where('last_name_p', 'like', `%${lastNameP}%`)
            })
            .preload('personalData', (pd) => {
                pd.preload('typeIdentify', (ti) => ti.select(['id', 'text']))
            })

        response.ok(employees)
    }

    /** Autocomplete endpoint combining name/last name/identify partial matching */
    public async findAutocomplete({ request, response }: HttpContext) {
        const { default: vine } = await import('@vinejs/vine')
        const schema = vine.compile(vine.object({
            value: vine.string().trim().minLength(1).optional(),
            businessId: vine.number().positive(),
            limit: vine.number().positive().max(100).optional(),
        }))
        const { value, businessId, limit } = await request.validateUsing(schema)
        const rows = await EmployeeRepository.findAutocomplete(businessId, value, limit ?? 20)
        if (!rows || !rows.length) return response.ok([])
        const employeeIds = rows.map((r: any) => r.id)
        const employees = await Employee.query()
            .whereIn('id', employeeIds)
            .select(['id', 'personal_data_id'])
            .preload('personalData', (pd) => {
                pd.preload('typeIdentify', (ti) => ti.select(['id', 'text']))
            })

        return response.ok(employees)
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
        const payload = await request.validateUsing(employeePermitStoreValidator)

        try {
            const permitData: any = {
                type: payload.type,
                date_start: payload.dateStart,
                date_end: payload.dateEnd,
                reason: payload.reason,
                employee_id: payload.employeeId,
                business_id: payload.businessId,
                authorizer_id: payload.authorizerId,
                authorized: false,
                created_at: dateTime,
                updated_at: dateTime,
                created_by: auth.user!.id,
                updated_by: auth.user!.id,
            }

            // Handle file upload if present
            const file = request.file('file')
            if (file) {
                const uploaded = await Google.uploadFile(file, 'admin/permits')
                Object.assign(permitData, {
                    file: uploaded.url,
                    file_short: uploaded.url_short,
                    thumb: uploaded.url_thumb,
                    thumb_short: uploaded.url_thumb_short,
                })
            }

            const permit = await EmployeePermit.create(permitData)

            const employee = await Employee.find(payload.employeeId)
            const authorizer = await User.find(payload.authorizerId)
            if (employee && authorizer) {
                try { await employee.load('personalData') } catch { }
                const pd: any = (employee as any).personalData || {}
                const fullName = [pd.names, pd.last_name_p, pd.last_name_m].filter(Boolean).join(' ').trim()
                emitter.emit('new::employeePermitStore', {
                    email: pd.email,
                    full_name: fullName,
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
            .preload('employee', (b) => b.preload('personalData'))
            .preload('business', (b) => b.select(['id', 'identify', 'name', 'url', 'url_thumb', 'email', 'phone']))
            .preload('authorizer', (b) => b.select(['id', 'identify', 'type_identify_id']))
            .first()
        if (!permit) return null
        const result: any = permit.toJSON()
        // Resolve authorizer position within the same business via BusinessEmployee -> Position
        try {
            if (permit.authorizerId) {
                const authorizer = await User.find(permit.authorizerId)
                const authorizerEmployee = await authorizer?.related('employee').query().where('business_id', permit.businessId).first()
                const authorizerEmployeeId = authorizerEmployee?.id

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
        const { employeeLicenseHealthStoreValidator } = await import('#validators/employee')
        const { bussinesId, ...payload }: EmployeeLicenseHealthStoreBody = await request.validateUsing(employeeLicenseHealthStoreValidator)
        try {

            // Normalize mixed boolean/number/string to boolean|number
            const normalizeBoolNumToString = (value: string | number | boolean | null | undefined): string | undefined => {
                if (value === null || value === undefined) return undefined
                if (typeof value === 'boolean') return value ? 'true' : 'false'
                if (typeof value === 'number') return String(value)
                const v = String(value).trim()
                if (v.toLowerCase() === 'true' || v.toLowerCase() === 'false') return v.toLowerCase()
                return v.length ? v : undefined
            }

            // Build a whitelisted, type-safe create payload
            const createData = {
                employeeId: payload.employeeId,
                typeLicenseId: payload.typeLicenseId,
                status: payload.status ?? undefined,
                folio: payload.folio ?? undefined,
                motiveId: payload.motiveId ?? undefined,
                workActivityId: payload.workActivityId ?? undefined,
                occupationId: payload.occupationId ?? undefined,
                dateStatus: this.toDt(payload.dateStatus ?? null),
                dateEndRelation: this.toDt(payload.dateEndRelation ?? null),
                dateDisposition: this.toDt(payload.dateDisposition ?? null),
                licenseLastSixMonth: normalizeBoolNumToString(payload.licenseLastSixMonth ?? undefined),
                paymentEntityId: payload.paymentEntityId ?? undefined,
                businessDate: this.toDt(payload.businessDate ?? null),
                businessComuna: payload.businessComuna ?? undefined,
                compensationBoxId: payload.compensationBoxId ?? undefined,
                mutualId: payload.mutualId ?? undefined,
                other: payload.other ?? undefined,
                employeeAge: payload.employeeAge !== undefined && payload.employeeAge !== null ? String(payload.employeeAge) : undefined,
                sonBirthDate: this.toDt(payload.sonBirthDate ?? null),
                sonLastNameP: payload.sonLastNameP ?? undefined,
                sonLastNameM: payload.sonLastNameM ?? undefined,
                sonNames: payload.sonNames ?? undefined,
                sonTypeIdentifyId: payload.sonTypeIdentifyId ?? undefined,
                sonIdentify: payload.sonIdentify ?? undefined,
                reposeSite: payload.reposeSite ?? undefined,
                reposeAddress: payload.reposeAddress ?? undefined,
                reposePhone: payload.reposePhone ?? undefined,
                reposeEmail: payload.reposeEmail ?? undefined,
                enabled: payload.enabled ?? false,
                businessId: bussinesId,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
            }

            const license = await EmployeeLicenseHealth.create(createData)
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
        const { employeeLicenseHealthUpdateValidator } = await import('#validators/employee')
        const { bussinesId, ...payload }: EmployeeLicenseHealthUpdateBody = await request.validateUsing(employeeLicenseHealthUpdateValidator)
        const license = await EmployeeLicenseHealth.find(licenseId)
        if (!license) return response.status(404).json(MessageFrontEnd(i18n.formatMessage('messages.data_not_found'), i18n.formatMessage('messages.error_title')))
        try {
            const normalizeBoolNumToString = (value: string | number | boolean | null | undefined): string | undefined => {
                if (value === null || value === undefined) return undefined
                if (typeof value === 'boolean') return value ? 'true' : 'false'
                if (typeof value === 'number') return String(value)
                const v = String(value).trim()
                if (v.toLowerCase() === 'true' || v.toLowerCase() === 'false') return v.toLowerCase()
                return v.length ? v : undefined
            }

            const patch: Partial<{
                typeLicenseId: number
                status: string
                folio: string
                motiveId: number
                dateStatus: DateTime | null
                dateEndRelation: DateTime | null
                workActivityId: number
                occupationId: number
                dateDisposition: DateTime | null
                licenseLastSixMonth: string | undefined
                paymentEntityId: number
                businessDate: DateTime | null
                businessComuna: string
                compensationBoxId: number
                mutualId: number
                other: string
                employeeAge: string
                sonBirthDate: DateTime | null
                sonLastNameP: string
                sonLastNameM: string
                sonNames: string
                sonTypeIdentifyId: number
                sonIdentify: string
                reposeSite: string
                reposeAddress: string
                reposePhone: string
                reposeEmail: string
                enabled: boolean
                businessId: number
                updatedById: number
            }> = { updatedById: auth.user!.id }

            if (bussinesId !== undefined) patch.businessId = bussinesId
            if ('typeLicenseId' in payload && typeof payload.typeLicenseId === 'number') patch.typeLicenseId = payload.typeLicenseId
            if ('status' in payload && typeof payload.status === 'string') patch.status = payload.status
            if ('folio' in payload && typeof payload.folio === 'string') patch.folio = payload.folio
            if ('motiveId' in payload && typeof payload.motiveId === 'number') patch.motiveId = payload.motiveId
            if ('workActivityId' in payload && typeof payload.workActivityId === 'number') patch.workActivityId = payload.workActivityId
            if ('occupationId' in payload && typeof payload.occupationId === 'number') patch.occupationId = payload.occupationId
            if ('paymentEntityId' in payload && typeof payload.paymentEntityId === 'number') patch.paymentEntityId = payload.paymentEntityId
            if ('businessComuna' in payload && typeof payload.businessComuna === 'string') patch.businessComuna = payload.businessComuna
            if ('compensationBoxId' in payload && typeof payload.compensationBoxId === 'number') patch.compensationBoxId = payload.compensationBoxId
            if ('mutualId' in payload && typeof payload.mutualId === 'number') patch.mutualId = payload.mutualId
            if ('other' in payload && typeof payload.other === 'string') patch.other = payload.other
            if ('employeeAge' in payload) patch.employeeAge = payload.employeeAge != null ? String(payload.employeeAge) : undefined
            if ('sonLastNameP' in payload && typeof payload.sonLastNameP === 'string') patch.sonLastNameP = payload.sonLastNameP
            if ('sonLastNameM' in payload && typeof payload.sonLastNameM === 'string') patch.sonLastNameM = payload.sonLastNameM
            if ('sonNames' in payload && typeof payload.sonNames === 'string') patch.sonNames = payload.sonNames
            if ('sonTypeIdentifyId' in payload && typeof payload.sonTypeIdentifyId === 'number') patch.sonTypeIdentifyId = payload.sonTypeIdentifyId
            if ('sonIdentify' in payload && typeof payload.sonIdentify === 'string') patch.sonIdentify = payload.sonIdentify
            if ('reposeSite' in payload && typeof payload.reposeSite === 'string') patch.reposeSite = payload.reposeSite
            if ('reposeAddress' in payload && typeof payload.reposeAddress === 'string') patch.reposeAddress = payload.reposeAddress
            if ('reposePhone' in payload && typeof payload.reposePhone === 'string') patch.reposePhone = payload.reposePhone
            if ('reposeEmail' in payload && typeof payload.reposeEmail === 'string') patch.reposeEmail = payload.reposeEmail
            if ('enabled' in payload) patch.enabled = Boolean(payload.enabled)

            // Dates
            if ('dateStatus' in payload) patch.dateStatus = this.toDt(payload.dateStatus ?? null)
            if ('dateEndRelation' in payload) patch.dateEndRelation = this.toDt(payload.dateEndRelation ?? null)
            if ('dateDisposition' in payload) patch.dateDisposition = this.toDt(payload.dateDisposition ?? null)
            if ('businessDate' in payload) patch.businessDate = this.toDt(payload.businessDate ?? null)
            if ('sonBirthDate' in payload) patch.sonBirthDate = this.toDt(payload.sonBirthDate ?? null)

            if ('licenseLastSixMonth' in payload) patch.licenseLastSixMonth = normalizeBoolNumToString(payload.licenseLastSixMonth)

            license.merge(patch)
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
