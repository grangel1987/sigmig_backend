import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'

type ShoppingSharePayload = {
    email: string
    full_name: string
    token: string
}

export default function registerShoppingShareListener() {
    emitter.on('new::shoppingShare', async (payload: ShoppingSharePayload) => {
        // Try to send using AdonisJS Mail service if available; fallback to log
        try {
            // Try to render HTML using @adonisjs/view if available
            let html: string | null = null
            try {
                const viewMod: any = await (Function('return import("@adonisjs/view/services")')() as Promise<any>).catch(() => null)
                const view = viewMod?.default
                if (view) {
                    html = await view.render('emails/shopping_share', {
                        full_name: payload.full_name,
                        token: payload.token,
                        // url: optional deep-link if available
                    })
                }
            } catch (error) {
                logger.warn('shopping_share_listener: view render failed, will fallback to text', { error })
            }

            // Commented out mailing code - remote server not prepared
            /*
            // Use dynamic import in a string form to avoid type resolution at build time
            const mod: any = await (Function('return import("@adonisjs/mail/services")')() as Promise<any>).catch(() => null)
            const mail = mod?.default
            if (mail) {
                await Mail.sendLater((message: any) => {
                    message.to(payload.email)
                    message.subject('Nueva cotización disponible')
                    const text = `Hola ${payload.full_name},\n\nHas recibido una nueva cotización.\n\nToken: ${payload.token}\n\nSaludos.\n`
                    if (html) message.html(html)
                    message.text(text)
                })
                logger.info('shopping_share_listener: mail sent', { to: payload.email })
                return
            }
            logger.warn('shopping_share_listener: Mail service not available, logging instead')
            */
        } catch (error) {
            logger.error('shopping_share_listener: mail send error', { error })
        }

        // Fallback placeholder
        logger.info('new::shoppingShare email placeholder', {
            to: payload.email,
            full_name: payload.full_name,
            token: payload.token,
        })
    })
}
