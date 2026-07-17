import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'

type ShoppingSharePayload = {
  email: string
  full_name: string
  token: string
  shoppingNumber: string
  businessName: string
  expirationDate: string
  shoppingUrl: string
  subject: string
  body: string
  shoppingNumberLabel: string
  businessLabel: string
  expirationDateLabel: string
  viewShoppingLabel: string
}

export default function registerShoppingShareListener() {
  emitter.on('new::shoppingShare', async (payload: ShoppingSharePayload) => {
    try {
      if (mail) {
        await mail.sendLater((message: any) => {
          message.to(payload.email)
          message.subject(payload.subject)
          message.htmlView('emails/shopping_share', {
            subject: payload.subject,
            body: payload.body,
            shoppingNumber: payload.shoppingNumber,
            expirationDate: payload.expirationDate,
            shoppingUrl: payload.shoppingUrl,
            businessName: payload.businessName,
            shoppingNumberLabel: payload.shoppingNumberLabel,
            expirationDateLabel: payload.expirationDateLabel,
            businessLabel: payload.businessLabel,
            viewShoppingLabel: payload.viewShoppingLabel,
          })
        })
        logger.info('shopping_share_listener: mail sent', { to: payload.email })
        return
      }
      logger.warn('shopping_share_listener: Mail service not available, logging instead')
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
