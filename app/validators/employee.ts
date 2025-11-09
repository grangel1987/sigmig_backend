import vine from '@vinejs/vine'

export const employeeStoreValidator = vine.compile(
    vine.object({
        type_identify_id: vine.number().positive(),
        identify: vine.string().trim().minLength(3),
        names: vine.string().trim().minLength(1),
        last_name_p: vine.string().trim().minLength(1),
        last_name_m: vine.string().trim().minLength(1),
        state_civil: vine.number().optional(),
        sex_id: vine.number().positive(),
        birth_date: vine.string().trim(), // ISO or yyyy-MM-dd expected
        nationality_id: vine.number().positive(),
        city_id: vine.number().positive(),
        address: vine.string(),
        phone: vine.string().optional(),
        movil: vine.string(),
        email: vine.string().email(),
        business_id: vine.number().positive(),
        // Business employee optional fields
        afp_id: vine.number().optional(),
        ex_regime_id: vine.number().optional(),
        afp2_id: vine.number().optional(),
        coin_ahorro_id: vine.number().optional(),
        affiliation_id: vine.number().optional(),
        layoff_id: vine.number().optional(),
        isapre_id: vine.number().optional(),
        load_family_id: vine.number().optional(),
        remuneration_type_id: vine.number().optional(),
        bank_id: vine.number().optional(),
        cost_center_id: vine.number().optional(),
        position_id: vine.number().optional(),
        type_account_id: vine.number().optional(),
        admission_date: vine.string().optional(),
        contract_date: vine.string().optional(),
        settlement_date: vine.string().optional(),

        // JSON strings (legacy compatibility)
        schedule_work: vine.string().optional(),
        certificate_health: vine.string().optional(),
        contacts_emergency: vine.string().optional(),
    })
)

export const employeeUpdateValidator = vine.compile(
    vine.object({
        type_identify_id: vine.number().positive(),
        identify: vine.string().trim().minLength(3),
        names: vine.string().trim().minLength(1),
        last_name_p: vine.string().trim().minLength(1),
        last_name_m: vine.string().trim().minLength(1),
        state_civil: vine.number().optional(),
        sex_id: vine.number().positive(),
        birth_date: vine.string().trim(),
        nationality_id: vine.number().positive(),
        city_id: vine.number().positive(),
        address: vine.string(),
        phone: vine.string().optional(),
        movil: vine.string(),
        email: vine.string().email(),

        business_id: vine.number().positive(),
        // Business employee optional fields
        afp_id: vine.number().optional(),
        ex_regime_id: vine.number().optional(),
        afp2_id: vine.number().optional(),
        coin_ahorro_id: vine.number().optional(),
        affiliation_id: vine.number().optional(),
        layoff_id: vine.number().optional(),
        isapre_id: vine.number().optional(),
        load_family_id: vine.number().optional(),
        remuneration_type_id: vine.number().optional(),
        bank_id: vine.number().optional(),
        cost_center_id: vine.number().optional(),
        position_id: vine.number().optional(),
        type_account_id: vine.number().optional(),

        admission_date: vine.string().optional(),
        contract_date: vine.string().optional(),
        settlement_date: vine.string().optional(),

        schedule_work: vine.string().optional(),
        certificate_health: vine.string().optional(),
        contacts_emergency: vine.string().optional(),
    })
)

export const employeePermitStoreValidator = vine.compile(
    vine.object({
        type: vine.string().trim(),
        date_start: vine.string().trim(),
        date_end: vine.string().trim(),
        reason: vine.string().trim(),
        employee_id: vine.number().positive(),
        business_id: vine.number().positive(),
        authorizer_id: vine.number().positive(),
    })
)

export const employeeLicenseHealthStoreValidator = vine.compile(
    vine.object({
        employee_id: vine.number().positive(),
        bussines_id: vine.number().positive(),
        status: vine.string(),
        folio: vine.string().optional(),
        date_status: vine.string().optional(),
        motive_id: vine.number().optional(),
        date_end_relation: vine.string().optional(),
        work_activity_id: vine.number().optional(),
        occupation_id: vine.number().optional(),
        date_disposition: vine.string().optional(),
        license_last_six_month: vine.string().optional(),
        payment_entity_id: vine.number().optional(),
        business_date: vine.string().optional(),
        business_comuna: vine.string().optional(),
        compensation_box_id: vine.number().optional(),
        mutual_id: vine.number().optional(),
        other: vine.string().optional(),
        employee_age: vine.number().optional(),
        son_birth_date: vine.string().optional(),
        son_last_name_p: vine.string().optional(),
        son_last_name_m: vine.string().optional(),
        son_names: vine.string().optional(),
        son_type_identify_id: vine.number().optional(),
        son_identify: vine.string().optional(),
        repose_site: vine.string().optional(),
        repose_address: vine.string().optional(),
        repose_email: vine.string().optional(),
        repose_phone: vine.string().optional(),
        type_license_id: vine.number().positive(),
    })
)

export const employeeLicenseHealthUpdateValidator = vine.compile(
    vine.object({
        employee_id: vine.number().positive(),
        bussines_id: vine.number().positive(),
        status: vine.string(),
        folio: vine.string().optional(),
        date_status: vine.string().optional(),
        motive_id: vine.number().optional(),
        date_end_relation: vine.string().optional(),
        work_activity_id: vine.number().optional(),
        occupation_id: vine.number().optional(),
        date_disposition: vine.string().optional(),
        license_last_six_month: vine.string().optional(),
        payment_entity_id: vine.number().optional(),
        business_date: vine.string().optional(),
        business_comuna: vine.string().optional(),
        compensation_box_id: vine.number().optional(),
        mutual_id: vine.number().optional(),
        other: vine.string().optional(),
        employee_age: vine.number().optional(),
        son_birth_date: vine.string().optional(),
        son_last_name_p: vine.string().optional(),
        son_last_name_m: vine.string().optional(),
        son_names: vine.string().optional(),
        son_type_identify_id: vine.number().optional(),
        son_identify: vine.string().optional(),
        repose_site: vine.string().optional(),
        repose_address: vine.string().optional(),
        repose_email: vine.string().optional(),
        repose_phone: vine.string().optional(),
        type_license_id: vine.number().positive(),
    })
)
