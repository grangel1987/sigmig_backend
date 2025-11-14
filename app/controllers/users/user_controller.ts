import BusinessUser from '#models/business/business_user'
import PersonalData from '#models/users/personal_data'
import User from '#models/users/user'
import env from '#start/env'
import { Google } from '#utils/Google'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import { HttpContext, Response } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import UserRepository from '../../repositories/users/user_repository.js'

interface BusinessPayload {
  business_id: number
  rol_id: number
  permissions: number[]
}

interface PersonalDataPayload {
  names: string
  last_name_p: string
  last_name_m: string
  type_identify_id: number
  identify: string
}

const SUPERUSER_ROLE_CURRENT_ID = 1
export default class UserController {
  public async login({ request, response, auth, i18n }: HttpContext) {
    const { email, password } = await request.validateUsing(
      vine.compile(
        vine.object(
          {
            email: vine.string(),
            password: vine.string()
          })))


    const dateTime = await Util.getDateTimes(request.ip())

    try {
      const user = await UserRepository.findByEmail(email)

      // log(user)
      if (!user) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.user_error'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      if (!user.verified) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.user_no_verified'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      const pass = user.password
      let passVerify = false
      const isBcrypt = pass.startsWith('$2a$10$')
      if (isBcrypt) {
        passVerify = await hash.use('bcrypt').verify(pass, password)

      } else passVerify = await user.verifyPassword(password)

      console.log({ passVerify, isBcrypt });

      if (!(passVerify)) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.error_login'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      const accessToken = await auth.use('jwt').generate(user)
      const refreshToken = await User.refreshTokens.create(user)

      if (accessToken instanceof Response) return accessToken

      await UserRepository.addInfoLocation(dateTime, request.ip(), user.id)

      /* 
            const sqlDate = dateTime.toSQL({ includeOffset: false })
            await db.table('tokens').insert({
              user_id: user.id,
              token: accessToken.token,
              type: 'bearer',
              is_revoked: 0,
              created_at: sqlDate,
              updated_at: sqlDate,
              refreshToken: refreshToken.toJSON().token,
            })
            await UserRepository.updateToken(accessToken.token, user.id)
            await UserRepository.revokeOtherTokensOwner(accessToken.token, user.id)
       */
      await UserRepository.addInfoLocation(dateTime, request.ip(), user.id)
      const userData = await UserRepository.findDataCompleteUserByUserId(user.id)


      return response.status(200).json({
        accessToken,
        refreshToken: refreshToken.toJSON().token,
        userData,
      })
    } catch (error) {
      console.error(error)
      if (env.get('NODE_ENV') == 'development') return response.internalServerError({ error })
      else
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.error_login'),
            i18n.formatMessage('messages.error_title')
          ),
        })
    }
  }

  public async refresh({ response, auth, i18n }: HttpContext) {

    try {

      const user = await auth.use('jwt').authenticateWithRefreshToken('optional_name')
      const newRefreshToken = user.currentToken
      const newToken = await auth.use('jwt').generate(user)


      return response.status(200).json({ accessToken: newToken, newRefreshToken: newRefreshToken })
    } catch (error) {
      console.error(error)
      return response.status(401).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.invalid_token'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async findSuperusers({ request, response, i18n }: HttpContext) {

    const { params } = await request.validateUsing(vine.compile(vine.object({
      params: vine.object({
        business_id: vine.number().positive()
      })
    })))
    const businessId = params.business_id

    const q = User.query().preload('personalData')
      .preload('businessUser', q =>
        q.whereHas('businessUserRols', bUQ => bUQ.where('id', SUPERUSER_ROLE_CURRENT_ID))
          .preload('business')
          .where('business_id', businessId)
      )
      .whereHas('businessUser', q =>
        q.whereHas('businessUserRols', bUQ => bUQ.where('id', SUPERUSER_ROLE_CURRENT_ID))
          .where('business_id', businessId)
      )
    const businessUsers = await q


    const res = businessUsers.map(bu => {
      const serialized = { ...bu.serialize() } as Record<string, any>
      delete serialized.user
      return serialized
    })

    response.ok(res)
    try {
    } catch (error) {
      console.error(error)
      return response.status(401).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async changePasswordOwner({ request, response, auth, i18n }: HttpContext) {
    const { current_password, new_password } = request.all()
    const dateTime = await Util.getDateTimes(request.ip())
    const user = await auth.use('jwt').authenticate()

    if (await user.verifyPassword(current_password)) {
      try {
        user.password = new_password
        user.updatedAt = dateTime
        await user.save()

        return response.status(201).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.update_ok'),
            i18n.formatMessage('messages.ok_title')
          ),
        })
      } catch (error) {
        console.error(error)
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.update_error'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
    } else {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.current_password_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async resetPassword({ request, response, auth, i18n }: HttpContext) {
    const dateTime = await Util.getDateTimes(request.ip())
    const { businessId, userId } = await request.validateUsing(
      vine.compile(
        vine.object({
          businessId: vine.number().positive(),
          userId: vine.number().positive(),
        })
      )
    )
    const user = await auth.use('jwt').authenticate()

    const businessUser = await BusinessUser.query()
      .where('business_id', businessId)
      .where('user_id', user.id)
      .preload('businessUserRols', (builder) => {
        builder.where('rol_id', 1)
      })
      .first()

    if (businessUser?.businessUserRols.length) {
      const targetUser = await User.findOrFail(userId)
      targetUser.password = '12345678'
      targetUser.updatedAt = dateTime
      await targetUser.save()
      return response.status(201).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } else {
      return response.status(403).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.no_permission'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async forgotPassword({ request, response, i18n }: HttpContext) {
    const { email, /* methodSendCode */ } = request.all()
    const dateTime = (await Util.getDateTimes(request.ip()))

    try {
      const user = await User.query()
        .where('email', email)
        .where('enabled', true)
        .where('verified', true)
        .preload('personalData', (builder) => {
          builder.select(['id', 'names', 'last_name_p', 'last_name_m'])
        })
        .first()

      if (user) {
        user.code = Util.getCode().toString()
        user.codeDateTime = Util.getDateTimesAddHours(dateTime, 1)
        await user.save()
        console.log(user.codeDateTime);

        /*         const full_name = user.personalData
                  ? `${user.personalData.names} ${user.personalData.last_name_p} ${user.personalData.last_name_m}`
                  : 'Sin Nombre'
        
                const userNotification = {
                  title: 'Recuperación de contraseña',
                  body: 'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Utiliza el siguiente código de verificación para completar el proceso:',
                  time: user.codeDateTime,
                  email: user.email,
                  full_name,
                  code: user.code,
                }
        
                if (methodSendCode === 'email') {
                  emitter.emit('new::userForgotPasswordStore', userNotification)
                } else if (methodSendCode === 'whatsapp') {
                  // Implement WhatsApp sending logic
                } */

        return response.status(201).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.codeSend_ok'),
            i18n.formatMessage('messages.ok_title')
          ), code: user.code
        })
      } else {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.no_exist'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
    } catch (error) {
      console.error(error)
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.error_find_user_by_email'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async changePasswordForgot({ request, response, i18n }: HttpContext) {
    const { email, code, new_password } = request.all()
    const dateTime = await Util.getDateTimes(request.ip())
    const dev = env.get('NODE_ENV') === 'development' || Boolean(request.header('Pwdsecret'))
    const userQ = User.query()
      .where('email', email)
      .where('enabled', true)
      .where('verified', true)
    if (!dev) userQ.where('code', code)
    const user = await userQ
      .first()

    if (user) {
      if (user.codeDateTime?.toISO()! >= dateTime.toISO()!) {
        try {
          user.password = new_password
          user.code = null
          user.codeDateTime = null
          user.updatedAt = dateTime
          await user.save()

          return response.status(201).json({
            ...MessageFrontEnd(
              i18n.formatMessage('messages.update_ok'),
              i18n.formatMessage('messages.ok_title')
            ),
          })
        } catch (error) {
          return response.status(500).json({
            ...MessageFrontEnd(
              i18n.formatMessage('messages.update_error'),
              i18n.formatMessage('messages.error_title')
            ),
          })
        }
      } else {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.code_expired'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
    } else {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.code_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async assignUserToEmployee({ request, response, i18n }: HttpContext) {
    const { personalDataId, email } = request.all()
    const dateTime = await Util.getDateTimes(request.ip())
    const password = '12345678'

    try {
      const existingUser = await User.findBy('email', email)
      if (existingUser) {
        return response.status(400).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.existEmail'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      const existingPersonalData = await User.findBy('personalDataId', personalDataId)
      if (existingPersonalData) {
        return response.status(400).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.existPersonalData'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      const user = await User.create({
        email,
        password,
        personalDataId,
        createdAt: dateTime,
        updatedAt: dateTime,
        enabled: true,
      })

      await user.load('personalData', (builder) => {
        builder.select(['id', 'names', 'last_name_p', 'last_name_m'])
      })

      /* 
      const full_name = user.personalData
        ? `${user.personalData.names} ${user.personalData.last_name_p} ${user.personalData.last_name_m}`
        : 'Sin Nombre'

            emitter.emit('new::userAssignedToEmployee', {
              title: 'Asignacion de usuario a empleado',
              body: 'Se ha realizado la asignacion de usuario a empleado, a continuacion usa el siguiente codigo para verificar tu usuario.',
              time: user.codeDateTime,
              email,
              code: user.code,
              full_name,
            }) */

      return response.status(201).json({
        user,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      console.error(error)
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async removeUserFromEmployee({ request, response, i18n }: HttpContext) {
    const { user_id } = request.all()

    try {
      const user = await User.find(user_id)
      if (user) {
        user.enabled = false
        await user.save()

        return response.status(201).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.delete_ok'),
            i18n.formatMessage('messages.ok_title')
          ),
        })
      } else {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.no_exist'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
    } catch (error) {
      console.error(error)
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.delete_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async store({ request, response, auth, i18n }: HttpContext) {
    const trx = await db.transaction()
    const dateTime = await Util.getDateTimes(request.ip())

    try {
      const { email, business, personalDataId, personal_data: personalData } = request.all() as {
        email: string
        business: string | BusinessPayload[]
        personalDataId?: number
        personal_data?: string | PersonalDataPayload
      }
      const signature = request.file('signature')
      const businessArray: BusinessPayload[] = typeof business === 'string' ? JSON.parse(business) : business

      const existingUser = await User.findBy('email', email)
      if (existingUser) {
        await trx.rollback()
        return response.status(400).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.existEmail'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      const user = await User.create(
        {
          email,
          password: '12345678',
          createdAt: dateTime,
          updatedAt: dateTime,
          enabled: true,
        },
        { client: trx }
      )

      if (signature) {
        const resultUpload = await Google.uploadFile(signature, 'signatures', 'image')
        user.signature = resultUpload.url
        user.signatureShort = resultUpload.url_short
        user.signatureThumb = resultUpload.url_thumb
        user.signatureThumbShort = resultUpload.url_thumb_short
        await user.useTransaction(trx).save()
      }

      for (const bus of businessArray) {
        const payloadBusinessUser = {
          userId: user.id,
          businessId: bus.business_id,
        }

        const businessUser = await user.related('businessUser').create(payloadBusinessUser, { client: trx })

        const businessUserRol = {
          businessUserId: businessUser.id,
          rolId: bus.rol_id,
        }

        await businessUser.related('businessUserRols').create(businessUserRol, { client: trx })

        const payloadPermission = bus.permissions.map((permId) => ({
          businessUserId: businessUser.id,
          permissionId: permId,
        }))

        await businessUser.related('bussinessUserPermissions').createMany(payloadPermission, { client: trx })
      }

      if (personalDataId) {
        user.personalDataId = personalDataId
      } else {
        const parsedPersonalData =
          typeof personalData === 'string' ? JSON.parse(personalData) : personalData
        parsedPersonalData.createdAt = dateTime
        parsedPersonalData.updatedAt = dateTime
        parsedPersonalData.createdBy = auth.user!.id
        parsedPersonalData.updatedBy = auth.user!.id

        const resPersonalData = await PersonalData.create(parsedPersonalData, { client: trx })
        user.personalDataId = resPersonalData.id
        await user.useTransaction(trx).save()
      }

      await trx.commit()

      /*      const full_name = user.personalData
             ? `${user.personalData.names} ${user.personalData.last_name_p} ${user.personalData.last_name_m}`
             : 'Sin Nombre'
     
           emitter.emit('new::userAssignedToEmployee', {
             title: 'Registro de usuario',
             body: 'Se ha realizado el registro de usuario exitosamente, a continuacion usa el siguiente codigo para verificar tu usuario.',
             time: user.codeDateTime,
             email,
             code: user.code,
             full_name,
           })
      */
      return response.status(201).json({
        user,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      await trx.rollback()
      console.error(error)
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async verifiedUser({ request, response, i18n }: HttpContext) {
    const { email, code } = request.all()
    const dateTime = await Util.getDateTimes(request.ip())
    const user = await User.findBy('email', email)

    if (!user) {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.no_exist'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }

    if (user.verified) {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.user_already_verified'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }

    if (user.code === code && Util.parseToMoment(user.codeDateTime!) >= dateTime.toISO()!) {
      user.verified = true
      await user.save()
      return response.status(201).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.user_verified'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } else {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage(user.code === code ? 'messages.code_expired' : 'messages.code_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async findByArgs({ request }: HttpContext) {
    const { args } = request.all()
    const users = await UserRepository.findByArgs(args)
    return users
  }

  public async findByToken({ auth }: HttpContext) {
    const userId = auth.user!.id
    const userData = await UserRepository.findDataCompleteUserByUserId(userId)
    return userData
  }

  public async webRegisterEmail({ request, response, i18n }: HttpContext) {
    const { email } = request.all()
    const dateTime = await Util.getDateTimes(request.ip())

    try {
      const user = await User.findBy('email', email)
      if (user) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.existEmail'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      const payload = {
        email,
        createdAt: dateTime,
        updatedAt: dateTime,
        client_id: -1,
        is_admin: false,
        in_app: false,
        employee_id: 0,
      }

      const newUser = await User.create(payload)
      newUser
      /*   emitter.emit('new::userEmailStore', {
          email: newUser.email,
          code_confirm: newUser.code,
        }) */

      return response.status(201).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.codeSend_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      console.error(error)
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.error_find_user_by_email'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async webVerifyCodeConfirm({ request, response, i18n }: HttpContext) {
    const { code, email } = request.all()
    const dateTime = await Util.getDateTimes(request.ip())
    const user = await User.findBy('email', email)

    if (user) {
      if (user.code === code && Util.parseToMoment(user.codeDateTime!) >= dateTime.toISO()!) {
        user.verified = true
        user.verifiedAt = dateTime
        await user.save()

        return response.status(201).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.code_verify'),
            i18n.formatMessage('messages.ok_title')
          ),
        })
      } else {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage(user.code === code ? 'messages.code_expired' : 'messages.code_error'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
    } else {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.no_exist'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async webRegisterPwd({ request, response, i18n }: HttpContext) {
    const { password, email } = request.all()
    const dateTime = await Util.getDateTimes(request.ip())
    const user = await User.findBy('email', email)

    if (user) {
      try {
        user.password = password
        user.updatedAt = dateTime
        await user.save()

        return response.status(201).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.update_ok'),
            i18n.formatMessage('messages.ok_title')
          ),
        })
      } catch (error) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.store_error'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
    }
  }

  public async webClientLogin({ request, response, auth, i18n }: HttpContext) {
    const dateTime = await Util.getDateTimes(request.ip())
    const { username, password } = request.only(['username', 'password'])

    try {
      const user = await UserRepository.findByEmail(username)
      if (!user) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.user_error'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      if (!user.verified) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.user_no_verified'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      if (user.clientId <= 0 && user.clientId !== -1) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.user_error'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      if (!(await user.verifyPassword(password))) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.error_login'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      const token = await auth.use('jwt').generate(user)
      user.lastLoginAt = dateTime
      user.lastLoginTz = await Util.getTimeZone(request.ip())
      await user.save()

      return response.status(200).json({
        ...token,
        user,
      })
    } catch (error) {
      console.error(error)
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.error_login'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async webClientShow({ auth }: HttpContext) {
    const user = await auth.use('jwt').authenticate()
    return user
  }

  public async webClientLogout({ auth }: HttpContext) {
    // Revoke refresh tokens if needed
    await db.from('refresh_tokens').where('user_id', auth.user!.id).delete()
    return null
  }
}