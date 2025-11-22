import BusinessEmployee from '#models/business/business_employee'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class BusinessEmployeeController {
    /** Move an employee from one business to another and cleanup schedules */
    public async changeBusiness({ request, response, i18n }: HttpContext) {
        const { default: vine } = await import('@vinejs/vine')
        const schema = vine.compile(
            vine.object({
                businessOldId: vine.number(),
                businessId: vine.number(),
                employeeId: vine.number(),
            })
        )
        const { businessOldId, businessId, employeeId } = await request.validateUsing(schema)

        try {
            const businessEmployee = await BusinessEmployee.query()
                .where('business_id', businessOldId)
                .where('employee_id', employeeId)
                .orderBy('id', 'desc')
                .first()

            if (businessEmployee) {
                businessEmployee.businessId = businessId
                await businessEmployee.save()

                await db.from('employee_schedule_works')
                    .where('employee_id', employeeId)
                    .where('business_id', businessOldId)
                    .delete()

                return response.status(201).json({
                    ...MessageFrontEnd(
                        i18n.formatMessage('messages.update_ok'),
                        i18n.formatMessage('messages.ok_title')
                    ),
                })
            }

            return response.status(404).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.data_not_found'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        } catch (error) {
            console.log(error);

            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    /** Clone an employee-business link to another business with adjusted dates */
    public async addOtherBusiness({ request, response, i18n }: HttpContext) {
        const { default: vine } = await import('@vinejs/vine')
        const schema = vine.compile(
            vine.object({
                businessOldId: vine.number(),
                businessId: vine.number(),
                employeeId: vine.number(),
            })
        )
        const { businessOldId, businessId, employeeId } = await request.validateUsing(schema)
        const dateTime = await Util.getDateTimes(request.ip())

        const exists = await BusinessEmployee.query()
            .where('business_id', businessId)
            .where('employee_id', employeeId)
            .orderBy('id', 'desc')
            .first()

        if (exists) {
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.employee_business_exist'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }

        const from = await BusinessEmployee.query()
            .where('business_id', businessOldId)
            .where('employee_id', employeeId)
            .orderBy('id', 'desc')
            .first()

        if (!from) {
            return response.status(404).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.data_not_found'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }

        try {
            const value: any = from.toJSON()
            delete value.id
            value.business_id = businessId
            value.created_at = dateTime
            value.updated_at = dateTime
            // normalize dates similar to legacy Util.parseToMoment usage
            if (value.admission_date) value.admission_date = Util.parseToMoment(value.admission_date, false, { separator: '-', firstYear: true })
            if (value.contract_date) value.contract_date = Util.parseToMoment(value.contract_date, false, { separator: '-', firstYear: true })

            await db.table('business_employees').insert(value)

            return response.status(201).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_ok'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }
}
