import vine from '@vinejs/vine'

export const employeeStoreValidator = vine.compile(
    vine.object({
        typeIdentifyId: vine.number().positive(),
        identify: vine.string().trim().minLength(3),
        names: vine.string().trim().minLength(1),
        lastNameP: vine.string().trim().minLength(1),
        lastNameM: vine.string().trim().minLength(1),
        stateCivil: vine.number().optional(),
        sexId: vine.number().positive(),
        birthDate: vine.string().trim(), // ISO or yyyyMMDd expected
        nationalityId: vine.number().positive(),
        cityId: vine.number().positive(),
        address: vine.string(),
        phone: vine.string().optional(),
        movil: vine.string(),
        email: vine.string().email(),
        businessId: vine.number().positive(),
        // Business employee optional fields
        afpId: vine.number().optional(),
        exRegimeId: vine.number().optional(),
        afp2Id: vine.number().optional(),
        coinAhorroId: vine.number().optional(),
        affiliationId: vine.number().optional(),
        layoffId: vine.number().optional(),
        isapreId: vine.number().optional(),
        loadFamilyId: vine.number().optional(),
        remunerationTypeId: vine.number().optional(),
        bankId: vine.number().optional(),
        costCenterId: vine.number().optional(),
        positionId: vine.number().optional(),
        typeAccountId: vine.number().optional(),
        admissionDate: vine.string().optional(),
        contractDate: vine.string().optional(),
        settlementDate: vine.string().optional(),

        // JSON strings (legacy compatibility)
        scheduleWork: vine.string().optional(),
        certificateHealth: vine.string().optional(),
        contactsEmergency: vine.string().optional(),
    })
)

export const employeeUpdateValidator = vine.compile(
    vine.object({
        typeIdentifyId: vine.number().positive(),
        identify: vine.string().trim().minLength(3),
        names: vine.string().trim().minLength(1),
        lastNameP: vine.string().trim().minLength(1),
        lastNameM: vine.string().trim().minLength(1),
        stateCivil: vine.number().optional(),
        sexId: vine.number().positive(),
        birthDate: vine.string().trim(),
        nationalityId: vine.number().positive(),
        cityId: vine.number().positive(),
        address: vine.string(),
        phone: vine.string().optional(),
        movil: vine.string(),
        email: vine.string().email(),

        businessId: vine.number().positive(),
        // Business employee optional fields
        afpId: vine.number().optional(),
        exRegimeId: vine.number().optional(),
        afp2Id: vine.number().optional(),
        coinAhorroId: vine.number().optional(),
        affiliationId: vine.number().optional(),
        layoffId: vine.number().optional(),
        isapreId: vine.number().optional(),
        loadFamilyId: vine.number().optional(),
        remunerationTypeId: vine.number().optional(),
        bankId: vine.number().optional(),
        costCenterId: vine.number().optional(),
        positionId: vine.number().optional(),
        typeAccountId: vine.number().optional(),

        admissionDate: vine.string().optional(),
        contractDate: vine.string().optional(),
        settlementDate: vine.string().optional(),

        scheduleWork: vine.string().optional(),
        certificateHealth: vine.string().optional(),
        contactsEmergency: vine.string().optional(),
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
    })
)

export const employeeLicenseHealthStoreValidator = vine.compile(
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
