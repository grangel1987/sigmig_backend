import env from '#start/env'
import emitter from '@adonisjs/core/services/emitter'
import Mail from '@adonisjs/mail/services/main'

// Register all application listeners here

let send = false

emitter.on('new::bookingStore', async (data) => {
    if (send)
        await Mail.send((message) => {
            message
                .to(data.email)
                .from(`Servicios Integrales Genessis ${env.get('FROM_EMAIL', 'contacto@serviciosgenessis.com')}`)
                .subject('SIG Platform: Registro de reserva')
                .htmlView('emails.booking_store', data)
        })
})

emitter.on('new::userAppStore', async (data) => {
    if (send)
        await Mail.send((message) => {
            message
                .to(data.email)
                .from(`Servicios Integrales Genessis ${env.get('FROM_EMAIL', 'contacto@serviciosgenessis.com')}`)
                .subject('SIG Platform: Registro de usuario')
                .htmlView('emails.user_app_store', data)
        })
})

emitter.on('new::userCodeConfirmStore', async (data) => {
    if (send)
        await Mail.send((message) => {
            message
                .to(data.email)
                .from(`Servicios Integrales Genessis ${env.get('FROM_EMAIL', 'contacto@serviciosgenessis.com')}`)
                .subject(`SIG Platform: ${data.type == 'i' ? 'Inactivacion' : 'Reactivacion'} de empleado`)
                .htmlView('emails.user_code_confirm_store', data)
        })
})

emitter.on('new::bookingStoreAdmin', async (data) => {
    if (send)
        await Mail.send((message) => {
            message
                .to('contacto@serviciosgenessis.com')
                .from(`Servicios Integrales Genessis ${env.get('FROM_EMAIL', 'contacto@serviciosgenessis.com')}`)
                .subject('SIG Platform: Reserva de propiedad')
                .htmlView('emails.booking_store_admin', data)
        })
})

emitter.on('new::bookingUpdate', async (data) => {
    if (send)
        await Mail.send((message) => {
            message
                .to(data.email)
                .from(`Servicios Integrales Genessis ${env.get('FROM_EMAIL', 'contacto@serviciosgenessis.com')}`)
                .subject('SIG Platform: Edicion de reserva de propiedad')
                .htmlView('emails.booking_update', data)
        })
})

emitter.on('new::shoppingShare', async (data) => {
    if (send)
        await Mail.send((message) => {
            message
                .to(data.email)
                .from(`Servicios Integrales Genessis ${env.get('FROM_EMAIL', 'contacto@serviciosgenessis.com')}`)
                .subject('Nueva orden de compra')
                .htmlView('emails.shopping_share', data)
        })
})

emitter.on('new::employeePermitStore', async (data) => {
    if (send)
        await Mail.send((message) => {
            message
                .to(data.email)
                .from(`Servicios Integrales Genessis ${env.get('FROM_EMAIL', 'contacto@serviciosgenessis.com')}`)
                .subject('Nueva permiso de trabajador')
                .htmlView('emails.employee_permit_store', data)
        })
})

emitter.on('new::employeePermitStoreAuthorizer', async (data) => {
    if (send)
        await Mail.send((message) => {
            message
                .to(data.email)
                .from(`Servicios Integrales Genessis ${env.get('FROM_EMAIL', 'contacto@serviciosgenessis.com')}`)
                .subject('Nueva permiso de trabajador')
                .htmlView('emails.employee_permit_store_authorizer', data)
        })
})

emitter.on('new::userEmailStore', async (data) => {
    if (send)
        await Mail.send((message) => {
            message
                .to(data.email)
                .from(`Servicios Integrales Genessis ${env.get('FROM_EMAIL', 'contacto@serviciosgenessis.com')}`)
                .subject('SIG Platform: Codigo de confirmacion')
                .htmlView('emails.user_email_store', data)
        })
})

emitter.on('new::clientRequestStore', async (data) => {
    if (send)
        await Mail.send((message) => {
            message
                .to(data.email)
                .from(`Servicios Integrales Genessis ${env.get('FROM_EMAIL', 'contacto@serviciosgenessis.com')}`)
                .subject('SIG Platform: Solicitud de reserva')
                .htmlView('emails.client_request_store', data)
        })
})

emitter.on('new::userForgotPasswordStore', async (data) => {
    if (send)
        await Mail.send((message) => {
            message
                .to(data.email)
                .from(`Servicios Integrales Genessis ${env.get('FROM_EMAIL', 'contacto@serviciosgenessis.com')}`)
                .subject('SIG Platform: Solicitud de codigo para cambiar clave')
                .htmlView('emails.user_code', data)
        })
})

emitter.on('new::userAssignedToEmployee', async (data) => {
    if (send)
        await Mail.send((message) => {
            message
                .to(data.email)
                .from(`Servicios Integrales Genessis ${env.get('FROM_EMAIL', 'contacto@serviciosgenessis.com')}`)
                .subject('SIG Platform: Asignacion de usuario a empleado')
                .htmlView('emails.user_code', data)
        })
})

emitter.on('new::userPasswordRecovered', async (data) => {
    await Mail.send((message) => {
        message
            .to(data.email)
            .from(`Servicios Integrales Genessis ${env.get('FROM_EMAIL', 'contacto@serviciosgenessis.com')}`)
            .subject('SIG Platform: Recuperación de contraseña')
            .htmlView('emails.user_password_recovery', data)
    })
})
