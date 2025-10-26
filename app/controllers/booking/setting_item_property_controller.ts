import SettingItemProperty from '#models/booking/setting_item_property';
import { HttpContext } from '@adonisjs/core/http';
import vine from '@vinejs/vine';

export default class SettingItemPropertyController {
    public async select({ request, response }: HttpContext) {

        const { page, perPage } = await request.validateUsing(vine.compile(vine.object({
            page: vine.number().positive().optional(),
            perPage: vine.number().positive().optional()
        })))

        try {
            const items = await SettingItemProperty.query()
                .where('enabled', true)
                .select(['id', 'label', 'group'])
                .orderBy('position')
                .paginate(page || 1, perPage || 10)

            const serializedItems = items.map(item => item.serialize())

            const groupedBy = Object.groupBy(serializedItems, v => v.group);
            return groupedBy
        } catch (error) {
            console.log(error)
            return response.status(500).json({
                message: 'Error fetching items',
                title: 'Error'
            })
        }
    }
}