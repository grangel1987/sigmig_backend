import env from '#start/env'
import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'
import type { EventsList } from '@adonisjs/core/types'

type MailDescriptor = {
    template: string
    subject: string | ((data: any) => string)
    overrideTo?: string | ((data: any) => string)
}

const MAIL_EVENTS: Record<string, MailDescriptor> = {
    'new::shoppingShare': {
        template: 'emails/shopping_share',
        subject: 'Nueva orden de compra',
    },
    'new::bookingStore': {
        // Legacy had a typo and a correct template; we keep the correct one
        template: 'emails/booking_store',
        subject: 'SIG Platform: Reserva de propiedad',
    },
    'new::userAppStore': {
        template: 'emails/user_app_store',
        subject: 'SIG Platform: Registro de usuario',
    },
    'new::userCodeConfirmStore': {
        template: 'emails/user_code_confirm_store',
        subject: (data) => `SIG Platform: ${data?.type === 'i' ? 'Inactivacion' : 'Reactivacion'} de empleado`,
    },
    'new::bookingStoreAdmin': {
        template: 'emails/booking_store_admin',
        subject: 'SIG Platform: Reserva de propiedad',
        overrideTo: () => 'contacto@serviciosgenessis.com',
    },
    'new::bookingUpdate': {
        template: 'emails/booking_update',
        subject: 'SIG Platform: Edicion de reserva de propiedad',
    },
    'new::employeePermitStore': {
        template: 'emails/employee_permit_store',
        subject: 'Nueva permiso de trabajador',
    },
    'new::employeePermitStoreAuthorizer': {
        template: 'emails/employee_permit_store_authorizer',
        subject: 'Nueva permiso de trabajador',
    },
    'new::userEmailStore': {
        template: 'emails/user_email_store',
        subject: 'SIG Platform: Codigo de confirmacion',
    },
    'new::clientRequestStore': {
        template: 'emails/client_request_store',
        subject: 'SIG Platform: Solicitud de reserva',
    },
    'new::userForgotPasswordStore': {
        template: 'emails/user_code',
        subject: 'SIG Platform: Solicitud de codigo para cambiar clave',
    },
    'new::userAssignedToEmployee': {
        template: 'emails/user_code',
        subject: 'SIG Platform: Asignacion de usuario a empleado',
    },
    'new::userPasswordRecovered': {
        template: 'emails/user_password_recovery',
        subject: 'SIG Platform: Recuperacion de clave',
    },
}

async function renderView(template: string, data: any): Promise<string | null> {
    try {
        const viewMod: any = await (Function('return import("@adonisjs/view/services")')() as Promise<any>).catch(() => null)
        const view = viewMod?.default
        if (!view) return null
        return await view.render(template, data)
    } catch (error) {
        logger.warn('mail_event_listener: view render failed', { template, error })
        return null
    }
}

async function sendMail(to: string, subject: string, html: string | null, textFallback: string) {
    try {
        const mod: any = await (Function('return import("@adonisjs/mail/services")')() as Promise<any>).catch(() => null)
        const mail = mod?.default
        if (!mail) {
            logger.warn('mail_event_listener: Mail service not available')
            return false
        }
        await mail.send((message: any) => {
            message.to(to)
            const fromAddress = env.get('MAIL_FROM') || env.get('MAIL_USERNAME')
            if (fromAddress) {
                try {
                    message.from({ address: fromAddress, name: 'Servicios Integrales Genessis' })
                } catch {
                    message.from(fromAddress)
                }
            }
            message.subject(subject)
            if (html) message.html(html)
            message.text(textFallback)
        })
        return true
    } catch (error) {
        logger.error('mail_event_listener: mail send error', { error })
        return false
    }
}

export default function registerMailEventListeners() {
    Object.entries(MAIL_EVENTS).forEach(([eventName, descriptor]) => {
        emitter.on(eventName as keyof EventsList, async (data: any) => {
            const to = typeof descriptor.overrideTo === 'function' ? descriptor.overrideTo(data) : descriptor.overrideTo || data?.email
            if (!to) {
                logger.warn('mail_event_listener: missing recipient email', { eventName })
                return
            }

            const subject = typeof descriptor.subject === 'function' ? descriptor.subject(data) : descriptor.subject
            const html = await renderView(descriptor.template, data)
            const textFallback = `${subject}`

            const sent = await sendMail(to, subject, html, textFallback)
            if (sent) {
                logger.info('mail_event_listener: mail sent', { eventName, to })
            } else {
                logger.info('mail_event_listener: placeholder', { eventName, to })
            }
        })
    })
}
