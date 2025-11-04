// Typed events for the AdonisJS emitter
// Extend the global EventsList so emitter.emit() is type-safe
declare module '@adonisjs/core/types' {
    interface EventsList {
        'new::shoppingShare': {
            email: string
            full_name: string
            token: string
        }
        // Legacy mail-driven events
        'new::bookingStore': { email: string;[key: string]: any }
        'new::userAppStore': { email: string;[key: string]: any }
        'new::userCodeConfirmStore': { email: string; type?: string;[key: string]: any }
        'new::bookingStoreAdmin': { email?: string;[key: string]: any }
        'new::bookingUpdate': { email: string;[key: string]: any }
        'new::employeePermitStore': { email: string;[key: string]: any }
        'new::employeePermitStoreAuthorizer': { email: string;[key: string]: any }
        'new::userEmailStore': { email: string;[key: string]: any }
        'new::clientRequestStore': { email: string;[key: string]: any }
        'new::userForgotPasswordStore': { email: string;[key: string]: any }
        'new::userAssignedToEmployee': { email: string;[key: string]: any }
    }
}
