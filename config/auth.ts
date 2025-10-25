import User from '#models/users/user'
import { defineConfig } from '@adonisjs/auth'
import { tokensUserProvider } from '@adonisjs/auth/access_tokens'
import { sessionUserProvider } from '@adonisjs/auth/session'
import type { Authenticators, InferAuthEvents } from '@adonisjs/auth/types'
import { jwtGuard } from '@maximemrf/adonisjs-jwt/jwt_config'
import { BaseJwtContent, JwtGuardUser } from '@maximemrf/adonisjs-jwt/types'


interface JwtContent extends BaseJwtContent {
  email: string
}


const authConfig = defineConfig({
  default: 'jwt',
  guards: {
    jwt: jwtGuard({

      // tokenExpiresIn can be a string or a number, it can be optional
      tokenExpiresIn: '24h',
      provider: sessionUserProvider({
        model: () => import('#models/users/user'),
      }),
      // if you want to use refresh tokens, you have to set the refreshTokenUserProvider
      refreshTokenUserProvider: tokensUserProvider({
        tokens: 'refreshTokens',
        model: () => import('#models/users/user')
      }),
      // content is a function that takes the user and returns the content of the token, it can be optional, by default it returns only the user id
      content: <T>(user: JwtGuardUser<T>): JwtContent => {
        return {
          userId: user.getId(),
          email: (user.getOriginal() as User).email,
        }
      },
    }),
  },
})

export default authConfig

/**
 * Inferring types from the configured auth
 * guards.
 */
declare module '@adonisjs/auth/types' {
  export interface Authenticators extends InferAuthenticators<typeof authConfig> { }
}
declare module '@adonisjs/core/types' {
  interface EventsList extends InferAuthEvents<Authenticators> { }
}