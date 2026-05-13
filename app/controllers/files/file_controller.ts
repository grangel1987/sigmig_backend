import { Google } from '#utils/Google'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

export default class FileController {
    public async refreshSignedUrl({ request, response, i18n }: HttpContext) {
        const payload = await request.validateUsing(
            vine.compile(
                vine.object({
                    filePath: vine.string().trim().minLength(1).optional(),
                    filepath: vine.string().trim().minLength(1).optional(),
                })
            )
        )

        const filePath = payload.filePath ?? payload.filepath

        if (!filePath) {
            return response.status(422).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }

        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            return response.status(422).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }

        try {
            const url = await Google.getSignedUrl(filePath)

            return response.ok({
                url,
                filePath,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_ok'),
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
}
