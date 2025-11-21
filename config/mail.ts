import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

// Minimal mail configuration for SMTP driver.
// This file is used by @adonisjs/mail when installed.
export default defineConfig({
    default: 'smtp',

    mailers: {
        smtp: transports.smtp({
            host: env.get('SMTP_HOST'),
            port: env.get('SMTP_PORT'),
            secure: true, // Use SSL for port 465

            auth: {
                type: 'login',
                user: env.get('SMTP_USERNAME'),
                pass: env.get('SMTP_PASSWORD')
            },

            tls: {
                rejectUnauthorized: false // Allow self-signed certificates if needed
            },

            ignoreTLS: false,
            requireTLS: false,

            pool: false,
            maxConnections: 5,
            maxMessages: 100,
        })
    }
})
