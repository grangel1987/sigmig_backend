import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

// Minimal mail configuration for SMTP driver.
// This file is used by @adonisjs/mail when installed.
export default defineConfig({
    default: 'smtp',

    mailers: {
        smtp: transports.smtp({
            host: env.get('SMTP_HOST', ''),
            port: env.get('SMTP_PORT', 587),
            secure: true, // Use SSL/TLS

            auth: {
                type: 'login',
                user: env.get('SMTP_USERNAME') || env.get('MAIL_USERNAME') || '',
                pass: env.get('SMTP_PASSWORD') || env.get('MAIL_PASSWORD') || ''
            },

            pool: true,
            maxConnections: 5,
            maxMessages: 100,
        })
    }
})
