import { personalDataSchema } from '#validators/personal_data'
import vine from '@vinejs/vine'

export const employeeStoreValidator = vine.compile(
    vine.object({
        enabled: vine.boolean().optional(),
        // All identity fields now live in personalData, not Employee
        businessId: vine.number().positive(),
        afpId: vine.number().optional(),
        afpPercentage: vine.number().optional(),
        exRegimeId: vine.number().optional(),
        afp2Id: vine.number().optional(),
        afp2Ahorro: vine.number().optional(),
        coinAhorroId: vine.number().optional(),
        typeContractId: vine.number().optional(),
        affiliationId: vine.number().optional(),
        layoffId: vine.number().optional(),
        isapreId: vine.number().optional(),
        loadFamilyId: vine.number().optional(),
        loadFamilyNormal: vine.number().optional(),
        loadFamilyInvalidate: vine.number().optional(),
        weeklyShiftHours: vine.number().optional(),
        viewLiquidation: vine.boolean().optional(),
        healthPactValue: vine.number().optional(),
        healthPactCoinId: vine.number().optional(),
        mountPact: vine.number().optional(),
        additionalPact: vine.number().optional(),
        remunerationTypeId: vine.number().optional(),
        remunerationAmount: vine.number().optional(),
        legalGratificationId: vine.number().optional(),
        bankId: vine.number().optional(),
        typeAccountId: vine.number().optional(),
        nroAccount: vine.string().optional(),
        owner: vine.string().optional(),
        zoneBonus: vine.number().optional(),
        snacksBonus: vine.number().optional(),
        mobilizationsBonus: vine.number().optional(),
        businessSalaryId: vine.number().optional(),
        quoteSis: vine.boolean().optional(),
        costCenterId: vine.number().optional(),
        positionId: vine.number().optional(),
        admissionDate: vine.string().optional(),
        contractDate: vine.string().optional(),
        settlementDate: vine.string().optional(),

        // Nested collections as arrays of objects
        scheduleWork: vine
            .array(
                vine.object({
                    workId: vine.number().positive(),
                    scheduleId: vine.number().positive(),
                    art22: vine.boolean().optional(),
                })
            )
            .optional(),
        certificateHealth: vine
            .array(
                vine.object({
                    healthItemId: vine.number().positive(),
                })
            )
            .optional(),
        contactsEmergency: vine
            .array(
                vine.object({
                    fullName: vine.string().trim().optional(),
                    phone1: vine.string().trim().optional(),
                    phone2: vine.string().trim().optional(),
                    relationshipId: vine.number().positive().optional(),
                })
            )
            .optional(),
        userId: vine.number().positive().exists({ table: 'users', column: 'id' }).optional().requiredIfMissing('personalData'),
        personalData: personalDataSchema.optional().requiredIfMissing('userId'),
    })
)

export const employeeUpdateValidator = vine.compile(
    vine.object({
        enabled: vine.boolean().optional(),
        // Shared identity fields with personalData made optional (can rely on personalDataId or personalData object)
        typeIdentifyId: vine.number().positive().optional(),
        identify: vine.string().trim().minLength(3).optional(),
        names: vine.string().trim().minLength(1).optional(),
        lastNameP: vine.string().trim().minLength(1).optional(),
        lastNameM: vine.string().trim().minLength(1).optional(),
        stateCivil: vine.number().optional(),
        sexId: vine.number().positive().optional(),
        birthDate: vine.string().trim().optional(),
        nationalityId: vine.number().positive().optional(),
        cityId: vine.number().positive().optional(),
        address: vine.string().optional(),
        phone: vine.string().optional(),
        movil: vine.string().optional(),
        email: vine.string().email().optional(),

        businessId: vine.number().positive(),
        // Business employee optional fields
        afpId: vine.number().optional(),
        afpPercentage: vine.number().optional(),
        exRegimeId: vine.number().optional(),
        afp2Id: vine.number().optional(),
        afp2Ahorro: vine.number().optional(),
        coinAhorroId: vine.number().optional(),
        typeContractId: vine.number().optional(),
        affiliationId: vine.number().optional(),
        layoffId: vine.number().optional(),
        isapreId: vine.number().optional(),
        loadFamilyId: vine.number().optional(),
        loadFamilyNormal: vine.number().optional(),
        loadFamilyInvalidate: vine.number().optional(),
        weeklyShiftHours: vine.number().optional(),
        viewLiquidation: vine.boolean().optional(),
        healthPactValue: vine.number().optional(),
        healthPactCoinId: vine.number().optional(),
        mountPact: vine.number().optional(),
        additionalPact: vine.number().optional(),
        remunerationTypeId: vine.number().optional(),
        remunerationAmount: vine.number().optional(),
        legalGratificationId: vine.number().optional(),
        bankId: vine.number().optional(),
        typeAccountId: vine.number().optional(),
        nroAccount: vine.string().optional(),
        owner: vine.string().optional(),
        zoneBonus: vine.number().optional(),
        snacksBonus: vine.number().optional(),
        mobilizationsBonus: vine.number().optional(),
        businessSalaryId: vine.number().optional(),
        quoteSis: vine.boolean().optional(),
        costCenterId: vine.number().optional(),
        positionId: vine.number().optional(),

        admissionDate: vine.string().optional(),
        contractDate: vine.string().optional(),
        settlementDate: vine.string().optional(),

        scheduleWork: vine
            .array(
                vine.object({
                    workId: vine.number().positive().optional(),
                    scheduleId: vine.number().positive().optional(),
                    art22: vine.boolean().optional(),
                })
            )
            .optional(),
        certificateHealth: vine
            .array(
                vine.object({
                    healthItemId: vine.number().positive(),
                })
            )
            .optional(),
        contactsEmergency: vine
            .array(
                vine.object({
                    fullName: vine.string().trim().optional(),
                    phone1: vine.string().trim().optional(),
                    phone2: vine.string().trim().optional(),
                    relationshipId: vine.number().positive().optional(),
                })
            )
            .optional(),
        userId: vine.number().positive().exists({ table: 'users', column: 'id' }).optional().requiredIfMissing('personalData'),
        personalData: personalDataSchema.optional().requiredIfMissing('userId'),
    })
)

export const employeePermitStoreValidator = vine.compile(
    vine.object({
        type: vine.string().trim(),
        dateStart: vine.string().trim(),
        dateEnd: vine.string().trim(),
        reason: vine.string().trim(),
        employeeId: vine.number().positive(),
        businessId: vine.number().positive(),
        authorizerId: vine.number().positive(),
        file: vine.file().optional(),
    })
)

export const employeeLicenseHealthStoreValidator = vine.compile(
    vine.object({
        employeeId: vine.number().positive(),
        bussinesId: vine.number().positive(),
        status: vine.string(),
        folio: vine.string().optional(),
        dateStatus: vine.string().optional(),
        motiveId: vine.number(),
        dateEndRelation: vine.string().optional(),
        workActivityId: vine.number().optional(),
        occupationId: vine.number().optional(),
        dateDisposition: vine.string().optional(),
        licenseLastSixMonth: vine.string().optional(),
        paymentEntityId: vine.number().optional(),
        businessDate: vine.string().optional(),
        businessComuna: vine.string().optional(),
        compensationBoxId: vine.number().optional(),
        mutualId: vine.number().optional(),
        other: vine.string().optional(),
        employeeAge: vine.number().optional(),
        sonBirthDate: vine.string().optional(),
        sonLastNameP: vine.string().optional(),
        sonLastNameM: vine.string().optional(),
        sonNames: vine.string().optional(),
        sonTypeIdentifyId: vine.number().optional(),
        sonIdentify: vine.string().optional(),
        reposeSite: vine.string().optional(),
        reposeAddress: vine.string().optional(),
        reposeEmail: vine.string().optional(),
        reposePhone: vine.string().optional(),
        typeLicenseId: vine.number().positive(),
    })
)

export const employeeLicenseHealthUpdateValidator = vine.compile(
    vine.object({
        employeeId: vine.number().positive(),
        bussinesId: vine.number().positive(),
        status: vine.string(),
        folio: vine.string().optional(),
        dateStatus: vine.string().optional(),
        motiveId: vine.number().optional(),
        dateEndRelation: vine.string().optional(),
        workActivityId: vine.number().optional(),
        occupationId: vine.number().optional(),
        dateDisposition: vine.string().optional(),
        licenseLastSixMonth: vine.string().optional(),
        paymentEntityId: vine.number().optional(),
        businessDate: vine.string().optional(),
        businessComuna: vine.string().optional(),
        compensationBoxId: vine.number().optional(),
        mutualId: vine.number().optional(),
        other: vine.string().optional(),
        employeeAge: vine.number().optional(),
        sonBirthDate: vine.string().optional(),
        sonLastNameP: vine.string().optional(),
        sonLastNameM: vine.string().optional(),
        sonNames: vine.string().optional(),
        sonTypeIdentifyId: vine.number().optional(),
        sonIdentify: vine.string().optional(),
        reposeSite: vine.string().optional(),
        reposeAddress: vine.string().optional(),
        reposeEmail: vine.string().optional(),
        reposePhone: vine.string().optional(),
        typeLicenseId: vine.number().positive(),
    })
)

// Lightweight validators for endpoints that previously used request.all()

export const employeeFindByIdentifyValidator = vine.compile(
    vine.object({
        identify: vine.string().trim().minLength(1),
        typeIdentify: vine.number().positive(),
        businessId: vine.number().positive(),
    })
)

export const employeeFindByIdValidator = vine.compile(
    vine.object({
        employeeId: vine.number().positive(),
        businessId: vine.number().positive(),
    })
)

export const employeeFindByNameValidator = vine.compile(
    vine.object({
        name: vine.string().trim().minLength(1),
        businessId: vine.number().positive(),
    })
)

export const employeeFindByLastNamePValidator = vine.compile(
    vine.object({
        lastNameP: vine.string().trim().minLength(1),
        businessId: vine.number().positive(),
    })
)

export const employeeDeletePhotoValidator = vine.compile(
    vine.object({
        employeeId: vine.number().positive(),
    })
)

export const employeeReportValidator = vine.compile(
    vine.object({
        condition: vine.number().positive(),
        expireDate: vine.string().optional(),
        costCenter: vine.number().optional(),
        businessId: vine.number().positive(),
    })
)

export const employeeBusinessEmployeeIdValidator = vine.compile(
    vine.object({
        businessEmployeeId: vine.number().positive(),
    })
)

export const employeeFindWorkPermitsValidator = vine.compile(
    vine.object({
        employeeId: vine.number().positive(),
        businessId: vine.number().positive(),
    })
)

export const employeePermitIdValidator = vine.compile(
    vine.object({
        permitId: vine.number().positive(),
    })
)

export const employeeFindLicensesHealthValidator = vine.compile(
    vine.object({
        employeeId: vine.number().positive(),
        businessId: vine.number().positive(),
    })
)

export const employeeFindAccessValidator = vine.compile(
    vine.object({
        condition: vine.number().positive(),
        workId: vine.number().optional(),
        dateStart: vine.string().optional(),
        dateEnd: vine.string().optional(),
    })
)

export const employeeFindAccessByEmployeeIdValidator = vine.compile(
    vine.object({
        employeeId: vine.number().positive(),
        condition: vine.number().positive(),
        dateStart: vine.string().optional(),
        dateEnd: vine.string().optional(),
    })
)
