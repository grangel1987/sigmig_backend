import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'
import { BaseModel, SnakeCaseNamingStrategy, } from '@adonisjs/lucid/orm'



BaseModel.namingStrategy = new SnakeCaseNamingStrategy()
const dbConfig = defineConfig({
  connection: 'mysql',
  connections: {
    mysql: {
      client: 'mysql2',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

export default dbConfig