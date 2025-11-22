import BusinessUser from '#models/business/business_user'
import Employee from '#models/employees/employee'
import PersonalData from '#models/users/personal_data'
import User from '#models/users/user'
import env from '#start/env'
import { Google } from '#utils/Google'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import { personalDataSchema } from '#validators/personal_data'
import { HttpContext, Response } from '@adonisjs/core/http'
import emitter from '@adonisjs/core/services/emitter'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import { log } from 'node:console'
import crypto from 'node:crypto'
import UserRepository from '../../repositories/users/user_repository.js'

interface BusinessPayload {
  businessId: number
  rolId?: number
  permissions?: number[]
}

// PersonalData payload validated inline in handlers to match the model

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
      // const userData = await UserRepository.findDataCompleteUserByUserId(user.id) // Removed to match legacy response

      return response.status(200).json({
        accessToken,
        refreshToken: refreshToken.toJSON().token,
        // userData, // Removed to match legacy response
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

    const q = User.query().preload('personalData', q => q.preload('typeIdentify').preload('city'))
      .preload('businessUser', q =>
        q.whereHas('businessUserRols', bUQ => bUQ.where('id', SUPERUSER_ROLE_CURRENT_ID))
          .preload('business')
          .where('business_id', businessId)
      )
      .whereHas('businessUser', q =>
        q.whereHas('businessUserRols', bUQ => bUQ.where('id', SUPERUSER_ROLE_CURRENT_ID))
          .where('business_id', businessId)
      ).orWhere('is_admin', true)
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
    const { current_password, newPassword } = request.all()
    const dateTime = await Util.getDateTimes(request.ip())
    const user = await auth.use('jwt').authenticate()

    if (await user.verifyPassword(current_password)) {
      try {
        user.password = newPassword
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

    try {
      const user = await User.query()
        .where('email', email)
        .where('enabled', true)
        .where('verified', true)
        .preload('personalData', (builder) => {
          builder.preload('typeIdentify').preload('city')
        })
        .first()

      if (user) {

        user.code = Util.getCode().toString()
        user.codeDateTime = DateTime.now().plus({ hours: 1 })
        await user.save()

        /*             const full_name = user.personalData
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
                        }  */

        try {
          await mail.send((message) => {
            message
              .to(user.email)
              .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
              .subject('SIGMI - Recuperación de Contraseña')
              .htmlView('emails/_forgot_password', {
                full_name: user.personalData?.fullName,
                code: user.code
              })
          })
          log('Email sent successfully')
        } catch (error) {
          console.error('Failed to send email:', error)
        }

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

  public async changePasswordForgot({ request, response, i18n, auth }: HttpContext) {
    // const isDev = env.get('NODE_ENV') === 'development' || Boolean(request.header('Pwdsecret'))
    const { email, code, newPassword } = await request.validateUsing(
      vine.compile(
        vine.object({
          email: vine.string().email().optional(),
          code: vine.string().trim().minLength(4),
          newPassword: vine.string().trim().minLength(8),
        })
      )
    )
    const dateTime = await Util.getDateTimes(request.ip())
    const dev = env.get('NODE_ENV') === 'development' || Boolean(request.header('Pwdsecret'))


    const userQ = User.query()
      .where('enabled', true)
      .where('verified', true)

    if (email)
      userQ.where('email', email)
    if (!dev) userQ.where('code', code)


    const user = auth.user || await userQ
      .first()

    if (user) {
      console.log(user.serialize());

      log({ codeDateTime: user.codeDateTime?.toISO(), now: DateTime.now().toISO() })
      if (user.codeDateTime?.toISO()! >= DateTime.now().toISO()!) {
        try {
          user.password = newPassword
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
        builder.preload('typeIdentify').preload('city')
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
    const { email, business, signature, employeeId, personalData, isAuthorizer, isAdmin } = await request.validateUsing(
      vine.compile(
        vine.object({
          email: vine.string().email().optional(),
          business: vine.array(
            vine.object({
              businessId: vine.number().positive(),
              rolId: vine.number().positive().optional(),
              permissions: vine.array(vine.number().positive()).optional()
            })
          ).optional(),
          employeeId: vine.number().positive().exists({ table: 'employees', column: 'id' }).optional().requiredIfMissing('personalData'),
          isAdmin: vine.boolean().optional(),
          isAuthorizer: vine.boolean().optional(),
          personalData: personalDataSchema.optional().requiredIfMissing('employeeId'),
          signature: vine.file({ extnames: ['jpg', 'jpeg', 'png', 'webp'], size: '5mb' }).optional(),
        })
      )
    )
    const createdFiles: string[] = []

    try {
      // Resolve final email from either top-level or personalData.email
      const resolvedEmail = email ?? personalData?.email
      if (!resolvedEmail) {
        await trx.rollback()
        return response.status(422).json({
          ...MessageFrontEnd(i18n.formatMessage('messages.email_required'), i18n.formatMessage('messages.error_title')),
        })
      }
      const businessArray: BusinessPayload[] = business ? (typeof business === 'string' ? JSON.parse(business) : business) : []

      const existingUser = await User.findBy('email', resolvedEmail)
      if (existingUser) {
        await trx.rollback()
        return response.status(422).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.existEmail'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      let personalDataId: number | undefined
      if (employeeId) {
        const employee = await Employee.findOrFail(employeeId)
        if (!employee.personalDataId) {
          await trx.rollback()
          return response.status(422).json({
            ...MessageFrontEnd(
              i18n.formatMessage('messages.employee_missing_personal_data'),
              i18n.formatMessage('messages.error_title')
            ),
          })
        }
        personalDataId = employee.personalDataId
      }

      const password = Util.getCode()
      const user = await User.create(
        {
          email: resolvedEmail,
          password: password,
          personalDataId: personalDataId,
          isAdmin: isAdmin ?? false,
          isAuthorizer: isAuthorizer ?? false,
          createdAt: dateTime,
          updatedAt: dateTime,
          enabled: true,
          verified: true
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
        createdFiles.push(resultUpload.url_short)
      }

      for (const bus of businessArray) {
        const payloadBusinessUser = {
          userId: user.id,
          businessId: bus.businessId,
        }

        const businessUser = await user.related('businessUser').create(payloadBusinessUser, { client: trx })

        const businessUserRol = {
          businessUserId: businessUser.id,
          rolId: bus.rolId || 0,
        }

        await businessUser.related('businessUserRols').create(businessUserRol, { client: trx })

        const payloadPermission = (bus.permissions || []).map((permId) => ({
          businessUserId: businessUser.id,
          permissionId: permId,
        }))

        if (payloadPermission?.length)
          await businessUser.related('bussinessUserPermissions').createMany(payloadPermission, { client: trx })
      }

      if (!personalDataId && personalData) {
        let imageData = {}
        let createdFile: string | null = null
        const { photo, ...rPersonalData } = personalData!

        if (photo) {
          const resultUploadPhoto =
            await Google.uploadFile(photo, 'personal_data', 'image')

          imageData = {
            photo: resultUploadPhoto.url,
            thumb: resultUploadPhoto.url_thumb,
            photoShort: resultUploadPhoto.url_short,
            thumbShort: resultUploadPhoto.url_thumb_short,
          }
          createdFile = resultUploadPhoto.url_short
        }

        const payloadPersonalData = {
          ...rPersonalData,
          ...imageData,
          email: resolvedEmail || user.email,
          birthDate: DateTime.fromJSDate(rPersonalData!.birthDate),
          phone: rPersonalData!.phone ?? null,
          createdAt: dateTime,
          updatedAt: dateTime,
          createdBy: auth.user!.id,
          updatedBy: auth.user!.id,
        }

        const resPersonalData = await PersonalData.create(payloadPersonalData, { client: trx })
        user.personalDataId = resPersonalData.id
        if (createdFile) createdFiles.push(createdFile)
      }
      // If an employeeId is provided, link the employee to this user
      if (employeeId) {
        const employee = await Employee.findOrFail(employeeId)
        if (employee.userId && employee.userId !== user.id) {
          await trx.rollback()
          return response.status(422).json({
            ...MessageFrontEnd(
              i18n.formatMessage('messages.exist_user_for_employee'),
              i18n.formatMessage('messages.error_title')
            ),
          })
        }
        employee.userId = user.id
        await employee.useTransaction(trx).save()
      }

      if (user.personalData.cityId)
        await user.personalData.load('city')

      await user.useTransaction(trx).save()
      await trx.commit()

      const full_name = user.personalData ? `${user.personalData.names} ${user.personalData.lastNameP} ${user.personalData.lastNameM}` : 'Usuario'


      try {
        await mail.sendLater((message) => {
          message
            .to(user.email)
            .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
            .subject('SIGMI Nuevo Usuario')
            .htmlView('emails/user_password_recovery', {
              full_name,
              password,
              time: dateTime.toISO()
            })
        })
      } catch (error) {
        console.error('Failed to send email:', error)
      }


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
      if (createdFiles.length) await Promise.all(createdFiles.map(file => Google.deleteFile(file)))
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async update({ request, response, auth, i18n }: HttpContext) {
    const { params, email, signature, employeeId, personalData } = await request.validateUsing(
      vine.compile(
        vine.object({
          params: vine.object({ id: vine.number().positive() }),
          email: vine.string().email().optional(),
          business: vine.any().optional(),
          employeeId: vine.number().positive().exists({ table: 'employees', column: 'id' }).optional().requiredIfMissing('personalData'),
          personalData: personalDataSchema.optional().requiredIfMissing('employeeId'),
          signature: vine.file({ extnames: ['jpg', 'jpeg', 'png', 'webp'], size: '5mb' }).optional(),
        })
      )
    )
    const trx = await db.transaction()
    const dateTime = await Util.getDateTimes(request.ip())
    const createdFiles: string[] = []

    try {

      const user = await User.findOrFail(params.id)
      user.useTransaction(trx)

      const candidateEmail = email ?? personalData?.email
      if (candidateEmail && candidateEmail !== user.email) {
        const existingUser = await User.findBy('email', candidateEmail)
        if (existingUser && existingUser.id !== user.id) {
          await trx.rollback()
          return response.status(422).json({
            ...MessageFrontEnd(
              i18n.formatMessage('messages.existEmail'),
              i18n.formatMessage('messages.error_title')
            ),
          })
        }
        user.email = candidateEmail
      }

      if (signature) {
        const resultUpload = await Google.uploadFile(signature, 'signatures', 'image')
        user.signature = resultUpload.url
        user.signatureShort = resultUpload.url_short
        user.signatureThumb = resultUpload.url_thumb
        user.signatureThumbShort = resultUpload.url_thumb_short
        createdFiles.push(resultUpload.url_short)
      }

      // If employeeId is provided, fetch employee and assign its personalDataId
      if (employeeId) {
        const employee = await Employee.findOrFail(employeeId)
        if (!employee.personalDataId) {
          await trx.rollback()
          return response.status(422).json({
            ...MessageFrontEnd(
              i18n.formatMessage('messages.employee_missing_personal_data'),
              i18n.formatMessage('messages.error_title')
            ),
          })
        }
        user.personalDataId = employee.personalDataId
      } else if (personalData) {
        let imageData = {}
        let createdFile: string | null = null
        const { photo, ...rPersonalData } = personalData
        try {
          if (photo) {
            const resultUploadPhoto = await Google.uploadFile(photo, 'personal_data', 'image')
            imageData = {
              photo: resultUploadPhoto.url,
              thumb: resultUploadPhoto.url_thumb,
              photoShort: resultUploadPhoto.url_short,
              thumbShort: resultUploadPhoto.url_thumb_short,
            }
            createdFile = resultUploadPhoto.url_short
          }

          if (user.personalDataId) {
            // Update existing personal data
            const pd = await PersonalData.findOrFail(user.personalDataId)
            pd.useTransaction(trx)
            pd.names = rPersonalData.names
            pd.lastNameP = rPersonalData.lastNameP
            pd.lastNameM = rPersonalData.lastNameM
            pd.typeIdentifyId = rPersonalData.typeIdentifyId
            pd.identify = rPersonalData.identify
            pd.stateCivilId = rPersonalData.stateCivilId
            pd.sexId = rPersonalData.sexId
            pd.birthDate = DateTime.fromJSDate(rPersonalData.birthDate)
            pd.nationalityId = rPersonalData.nationalityId
            pd.cityId = rPersonalData.cityId
            pd.address = rPersonalData.address
            pd.phone = rPersonalData.phone ?? user.email
            pd.movil = rPersonalData.movil
            pd.email = rPersonalData.email ?? user.email
            Object.assign(pd, imageData)
            pd.updatedAt = dateTime
            pd.updatedBy = auth.user!.id
            await pd.save()
          } else {
            // Create new personal data
            const payloadPersonalData = {
              ...rPersonalData,
              ...imageData,
              birthDate: DateTime.fromJSDate(rPersonalData.birthDate),
              phone: rPersonalData.phone ?? null,
              createdAt: dateTime,
              updatedAt: dateTime,
              createdBy: auth.user!.id,
              updatedBy: auth.user!.id,
            }
            const resPersonalData = await PersonalData.create(payloadPersonalData, { client: trx })
            user.personalDataId = resPersonalData.id
          }
        } catch (error) {
          if (createdFile) await Google.deleteFile(createdFile)
          throw error
        }
      }

      user.updatedAt = dateTime
      await user.save()
      await trx.commit()

      return response.status(200).json({
        user,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      await trx.rollback()
      console.error(error)
      if (createdFiles.length) await Promise.all(createdFiles.map(file => Google.deleteFile(file)))
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async updateAdmin({ request, response, auth, i18n }: HttpContext) {
    const { params, email, business, personalData, isAdmin, isAuthorizer, signature } = await request.validateUsing(
      vine.compile(
        vine.object({
          params: vine.object({ userId: vine.number().positive() }),
          email: vine.string().email().optional(),
          business: vine.array(
            vine.object({
              businessId: vine.number().positive(),
              rolId: vine.number().positive().optional(),
              permissions: vine.array(vine.number().positive()).optional()
            })
          ).optional(),
          personalData: personalDataSchema.optional(),
          isAdmin: vine.boolean().optional(),
          isAuthorizer: vine.boolean().optional(),
          signature: vine.file({ extnames: ['jpg', 'jpeg', 'png', 'webp'], size: '5mb' }).optional(),
        })
      )
    )
    const trx = await db.transaction()
    const dateTime = await Util.getDateTimes(request.ip())
    const createdFiles: string[] = []

    try {

      const user = await User.findOrFail(params.userId)
      user.useTransaction(trx)

      // Update email if provided
      if (email && email !== user.email) {
        const existingUser = await User.findBy('email', email)
        if (existingUser && existingUser.id !== user.id) {
          await trx.rollback()
          return response.status(422).json({
            ...MessageFrontEnd(
              i18n.formatMessage('messages.existEmail'),
              i18n.formatMessage('messages.error_title')
            ),
          })
        }
        user.email = email
      }

      // Update admin flags
      if (isAdmin !== undefined) user.isAdmin = isAdmin
      if (isAuthorizer !== undefined) user.isAuthorizer = isAuthorizer

      // Handle signature upload
      if (signature) {
        const resultUpload = await Google.uploadFile(signature, 'signatures', 'image')
        user.signature = resultUpload.url
        user.signatureShort = resultUpload.url_short
        user.signatureThumb = resultUpload.url_thumb
        user.signatureThumbShort = resultUpload.url_thumb_short
        createdFiles.push(resultUpload.url_short)
      }

      // Update business assignments if provided
      if (business && business.length > 0) {
        // Remove existing business assignments
        await user.related('businessUser').query().delete()

        for (const bus of business) {
          const payloadBusinessUser = {
            userId: user.id,
            businessId: bus.businessId,
          }

          const businessUser = await user.related('businessUser').create(payloadBusinessUser, { client: trx })

          const businessUserRol = {
            businessUserId: businessUser.id,
            rolId: bus.rolId || 0,
          }

          await businessUser.related('businessUserRols').create(businessUserRol, { client: trx })

          const payloadPermission = (bus.permissions || []).map((permId) => ({
            businessUserId: businessUser.id,
            permissionId: permId,
          }))

          if (payloadPermission?.length)
            await businessUser.related('bussinessUserPermissions').createMany(payloadPermission, { client: trx })
        }
      }

      // Update personal data if provided
      if (personalData) {
        let imageData = {}
        let createdFile: string | null = null
        const { photo, ...rPersonalData } = personalData

        if (photo) {
          const resultUploadPhoto = await Google.uploadFile(photo, 'personal_data', 'image')
          imageData = {
            photo: resultUploadPhoto.url,
            thumb: resultUploadPhoto.url_thumb,
            photoShort: resultUploadPhoto.url_short,
            thumbShort: resultUploadPhoto.url_thumb_short,
          }
          createdFile = resultUploadPhoto.url_short
        }

        if (user.personalDataId) {
          // Update existing personal data
          const pd = await PersonalData.findOrFail(user.personalDataId)
          pd.useTransaction(trx)
          pd.names = rPersonalData.names
          pd.lastNameP = rPersonalData.lastNameP
          pd.lastNameM = rPersonalData.lastNameM
          pd.typeIdentifyId = rPersonalData.typeIdentifyId
          pd.identify = rPersonalData.identify
          pd.stateCivilId = rPersonalData.stateCivilId
          pd.sexId = rPersonalData.sexId
          pd.birthDate = DateTime.fromJSDate(rPersonalData.birthDate)
          pd.nationalityId = rPersonalData.nationalityId
          pd.cityId = rPersonalData.cityId
          pd.address = rPersonalData.address
          pd.phone = rPersonalData.phone ?? user.email
          pd.movil = rPersonalData.movil
          pd.email = rPersonalData.email ?? user.email
          Object.assign(pd, imageData)
          pd.updatedAt = dateTime
          pd.updatedBy = auth.user!.id
          await pd.save()
        } else {
          // Create new personal data
          const payloadPersonalData = {
            ...rPersonalData,
            ...imageData,
            birthDate: DateTime.fromJSDate(rPersonalData.birthDate),
            phone: rPersonalData.phone ?? null,
            createdAt: dateTime,
            updatedAt: dateTime,
            createdBy: auth.user!.id,
            updatedBy: auth.user!.id,
          }
          const resPersonalData = await PersonalData.create(payloadPersonalData, { client: trx })
          user.personalDataId = resPersonalData.id
        }
        if (createdFile) createdFiles.push(createdFile)
      }

      user.updatedAt = dateTime
      await user.save()
      await trx.commit()

      await user.load('personalData')

      if (user.personalData.cityId)
        await user.personalData.load('city')

      return response.status(200).json({
        user,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      await trx.rollback()
      console.error(error)
      if (createdFiles.length) await Promise.all(createdFiles.map(file => Google.deleteFile(file)))
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_error'),
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
    const { text } = request.all()
    const users = await UserRepository.findByArgs(text)
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

  /**
   * Recover password by generating a random temporary password and emailing it to the user.
   * This does not expose the password publicly (only via email template).
   */
  public async recoverPassword({ request, response, i18n }: HttpContext) {
    const { email } = await request.validateUsing(vine.compile(vine.object({ email: vine.string().email() })))
    const dateTime = await Util.getDateTimes(request.ip())

    try {
      const user = await User.query()
        .where('email', email)
        .where('enabled', true)
        .where('verified', true)
        .preload('personalData', q => q.select(['names', 'last_name_p', 'last_name_m']).preload('typeIdentify').preload('city'))
        .first()

      if (!user) {
        return response.status(404).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.no_exist'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      // Generate a secure random password (12 chars alphanumeric)
      const raw = crypto.randomBytes(16).toString('base64')
      const tempPassword = raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
      // Ensure minimum length
      const finalPassword = tempPassword.length < 10 ? tempPassword + crypto.randomBytes(4).toString('hex').slice(0, 2) : tempPassword

      user.password = finalPassword
      user.updatedAt = dateTime
      await user.save()

      const full_name = user.personalData
        ? `${user.personalData.names} ${user.personalData.lastNameP} ${user.personalData.lastNameM}`
        : 'Usuario'

      emitter.emit('new::userPasswordRecovered' as any, {
        email: user.email,
        full_name,
        password: finalPassword,
        time: dateTime.toISO(),
      })

      return response.status(200).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      console.error(error)
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
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

  /**
   * Update only the user signature image.
   */
  public async updateSignature({ request, response, i18n }: HttpContext) {
    const { params, signature } = await request.validateUsing(
      vine.compile(
        vine.object({
          params: vine.object({ id: vine.number().positive() }),
          signature: vine.file({ extnames: ['jpg', 'jpeg', 'png', 'webp'], size: '5mb' }),
        })
      )
    )
    const dateTime = await Util.getDateTimes(request.ip())
    try {
      const user = await User.findOrFail(params.id)
      const oldShort = user.signatureShort
      const upload = await Google.uploadFile(signature, 'signatures', 'image')
      user.signature = upload.url
      user.signatureShort = upload.url_short
      user.signatureThumb = upload.url_thumb
      user.signatureThumbShort = upload.url_thumb_short
      user.updatedAt = dateTime
      await user.save()
      await user.load('personalData', q => q.preload('typeIdentify').preload('city'))
      if (oldShort) await Google.deleteFile(oldShort).catch(() => null)
      return response.ok({
        user,
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
  }

  /**
   * Update only the PersonalData photo for a given user id.
   */
  public async updatePhoto({ request, response, i18n }: HttpContext) {
    const { params, photo } = await request.validateUsing(
      vine.compile(
        vine.object({
          params: vine.object({ id: vine.number().positive() }),
          photo: vine.file({ extnames: ['jpg', 'jpeg', 'png', 'webp'], size: '5mb' }),
        })
      )
    )
    const dateTime = await Util.getDateTimes(request.ip())
    try {
      const user = await User.findOrFail(params.id)
      if (!user.personalDataId) {
        return response.status(422).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.employee_missing_personal_data'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
      const personalData = await PersonalData.findOrFail(user.personalDataId)
      const oldShort = personalData.photoShort
      const upload = await Google.uploadFile(photo, 'personal_data', 'image')
      personalData.photo = upload.url
      personalData.thumb = upload.url_thumb
      personalData.photoShort = upload.url_short
      personalData.thumbShort = upload.url_thumb_short
      personalData.updatedAt = dateTime
      await personalData.save()
      await personalData.load('typeIdentify')
      await personalData.load('city')
      if (oldShort) await Google.deleteFile(oldShort).catch(() => null)
      return response.ok({
        personalData,
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
  }

  /**
   * Delete user signature image and clear signature fields.
   */
  public async deleteSignature({ request, response, i18n }: HttpContext) {
    const { params } = await request.validateUsing(
      vine.compile(
        vine.object({
          params: vine.object({ id: vine.number().positive() }),
        })
      )
    )
    const dateTime = await Util.getDateTimes(request.ip())
    try {
      const user = await User.findOrFail(params.id)
      const oldShort = user.signatureShort
      user.signature = null as any
      user.signatureShort = null as any
      user.signatureThumb = null as any
      user.signatureThumbShort = null as any
      user.updatedAt = dateTime
      await user.save()
      if (oldShort) await Google.deleteFile(oldShort).catch(() => null)
      return response.ok({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.delete_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
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

  public async deletePhoto({ request, response, i18n }: HttpContext) {
    const { params } = await request.validateUsing(
      vine.compile(
        vine.object({
          params: vine.object({ id: vine.number().positive() }),
        })
      )
    )
    const dateTime = await Util.getDateTimes(request.ip())
    try {
      const user = await User.findOrFail(params.id)
      if (!user.personalDataId) {
        return response.status(422).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.employee_missing_personal_data'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
      const personalData = await PersonalData.findOrFail(user.personalDataId)
      const oldShort = personalData.photoShort
      personalData.photo = null
      personalData.thumb = null
      personalData.photoShort = null
      personalData.thumbShort = null
      personalData.updatedAt = dateTime
      await personalData.save()
      if (oldShort) await Google.deleteFile(oldShort).catch(() => null)
      return response.ok({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.delete_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
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

  public async findModules({ response }: HttpContext) {
    // Placeholder: return a list of modules
    const modules = [
      { id: 1, name: 'Users', description: 'User management' },
      { id: 2, name: 'Business', description: 'Business management' },
      // Add more as needed
    ]
    response.ok(modules)
  }

  public async findPermission({ request, response }: HttpContext) {
    const { module_id } = await request.validateUsing(vine.compile(vine.object({ module_id: vine.number().positive() })))
    // Placeholder: return permissions for the module
    const permissions = [
      { id: 1, key: 'user.create', description: 'Create users', type: 'user', module_id: 1 },
      { id: 2, key: 'user.read', description: 'Read users', type: 'user', module_id: 1 },
      { id: 3, key: 'business.create', description: 'Create business', type: 'business', module_id: 2 },
      // Add more as needed
    ].filter(p => p.module_id === module_id)
    response.ok(permissions)
  }

  public async index({ request, response }: HttpContext) {
    const { page, perPage } = await request.validateUsing(
      vine.compile(
        vine.object({
          page: vine.number().positive().optional(),
          perPage: vine.number().positive().optional(),
        })
      )
    )

    const query = User.query()
      .preload('personalData', q => q.preload('typeIdentify').preload('city'))
      .preload('businessUser', buQ => buQ.preload('business', bQ => bQ.select('id', 'name')))

    const users = page ? await query.paginate(page, perPage ?? 10) : await query
    response.ok(users)
  }

  public async storeAdmin({ request, response, auth, i18n }: HttpContext) {
    // Similar to store, but for admin
    const dateTime = await Util.getDateTimes(request.ip())
    const { email, business, personalData, signature } = await request.validateUsing(
      vine.compile(
        vine.object({
          email: vine.string().email(),
          business: vine.array(
            vine.object({
              businessId: vine.number().positive(),
              rolId: vine.number().positive().optional(),
              permissions: vine.array(vine.number().positive()).optional()
            })
          ).optional(),
          personalData: personalDataSchema,
          signature: vine.file({ extnames: ['jpg', 'jpeg', 'png', 'webp'], size: '5mb' }).optional(),
        })
      )
    )
    const createdFiles: string[] = []
    const businessArray: BusinessPayload[] = business ? (typeof business === 'string' ? JSON.parse(business) : business) : []
    const trx = await db.transaction()

    try {
      const existingUser = await User.findBy('email', email)
      if (existingUser) {
        await trx.rollback()
        return response.status(422).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.existEmail'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      const password = Util.getCode()
      const user = await User.create(
        {
          email,
          password: password,
          isAuthorizer: true,
          createdAt: dateTime,
          updatedAt: dateTime,
          enabled: true,
          verified: true,
          isAdmin: true,
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
        createdFiles.push(resultUpload.url_short)
      }

      for (const bus of businessArray) {
        const payloadBusinessUser = {
          userId: user.id,
          businessId: bus.businessId,
        }

        const businessUser = await user.related('businessUser').create(payloadBusinessUser, { client: trx })

        const businessUserRol = {
          businessUserId: businessUser.id,
          rolId: bus.rolId || 0,
        }

        await businessUser.related('businessUserRols').create(businessUserRol, { client: trx })

        const payloadPermission = (bus.permissions || []).map((permId) => ({
          businessUserId: businessUser.id,
          permissionId: permId,
        }))

        if (payloadPermission?.length)
          await businessUser.related('bussinessUserPermissions').createMany(payloadPermission, { client: trx })
      }

      if (personalData) {
        let imageData = {}
        let createdFile: string | null = null
        const { photo, ...rPersonalData } = personalData

        if (photo) {
          const resultUploadPhoto = await Google.uploadFile(photo, 'personal_data', 'image')
          imageData = {
            photo: resultUploadPhoto.url,
            thumb: resultUploadPhoto.url_thumb,
            photoShort: resultUploadPhoto.url_short,
            thumbShort: resultUploadPhoto.url_thumb_short,
          }
          createdFile = resultUploadPhoto.url_short
        }

        const payloadPersonalData = {
          ...rPersonalData,
          ...imageData,
          email: personalData.email || user.email,
          birthDate: DateTime.fromJSDate(rPersonalData.birthDate),
          phone: rPersonalData.phone ?? null,
          createdAt: dateTime,
          updatedAt: dateTime,
          createdBy: auth.user!.id,
          updatedBy: auth.user!.id,
        }

        const resPersonalData = await PersonalData.create(payloadPersonalData, { client: trx })
        user.personalDataId = resPersonalData.id
        if (createdFile) createdFiles.push(createdFile)
      }

      await user.load('personalData', pQ => pQ.preload('typeIdentify'))
      if (user.personalData?.cityId) await user.personalData.load('city')
      await user.useTransaction(trx).save()
      await trx.commit()

      await mail.sendLater((message) => {
        message
          .to(user.email)
          .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
          .subject('SIGMI Nuevo Usuario')
          .htmlView('emails/user_password_recovery', {
            full_name: user.personalData.fullName,
            password: password,
            time: dateTime.toISO()
          })
      })

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
      if (createdFiles.length) await Promise.all(createdFiles.map(file => Google.deleteFile(file)))
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async storeCodeConfirm({ request, response, i18n }: HttpContext) {
    const { email } = await request.validateUsing(vine.compile(vine.object({ email: vine.string().email() })))

    try {
      const user = await User.findBy('email', email)
      if (!user) {
        return response.status(404).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.no_exist'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      user.code = Util.getCode().toString()
      user.codeDateTime = DateTime.now().plus({ hours: 1 })
      await user.save()

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
          i18n.formatMessage('messages.error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async verifyCodeConfirm({ request, response, i18n }: HttpContext) {
    const { email, code } = await request.validateUsing(vine.compile(vine.object({ email: vine.string().email(), code: vine.string() })))
    const dateTime = await Util.getDateTimes(request.ip())
    const user = await User.findBy('email', email)

    if (!user) {
      return response.status(404).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.no_exist'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }

    if (user.code === code && user.codeDateTime && user.codeDateTime.toISO()! >= dateTime.toISO()!) {
      user.verified = true
      user.code = null
      user.codeDateTime = null
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
          user.code === code ? 'messages.code_expired' : 'messages.code_error',
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async show({ params, response, i18n }: HttpContext) {
    try {
      const user = await User.query()
        .where('id', params.id)
        .preload('personalData', q => q.preload('typeIdentify').preload('city'))
        .preload('businessUser', buQ => buQ.preload('business', bQ => bQ.select('id', 'name')))
        .first()

      if (!user) {
        return response.status(404).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.user_not_found'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      return response.json({
        success: true,
        data: user,
        message: i18n.formatMessage('messages.user_found')
      })
    } catch (error) {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.error_occurred'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async toggleUserStatus({ params, response, i18n }: HttpContext) {
    const dateTime = DateTime.now()

    try {
      const user = await User.findOrFail(params.id)
      const wasEnabled = user.enabled
      user.enabled = !user.enabled
      user.updatedAt = dateTime
      await user.save()

      return response.status(200).json({
        ...MessageFrontEnd(
          i18n.formatMessage(wasEnabled ? 'messages.user_disabled' : 'messages.user_enabled'),
          i18n.formatMessage('messages.ok_title')
        ),
        enabled: user.enabled
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
  }

  public async adminResetPassword({ request, response, auth, i18n }: HttpContext) {
    const { userId } = await request.validateUsing(
      vine.compile(
        vine.object({
          userId: vine.number().positive(),
        })
      )
    )
    const dateTime = DateTime.now()

    // Check if current user is admin
    if (!auth.user!.isAdmin) {
      return response.status(403).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.no_permission'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }

    try {
      const user = await User.findOrFail(userId)

      // Generate a secure random password (12 chars alphanumeric)
      const raw = crypto.randomBytes(16).toString('base64')
      const tempPassword = raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
      // Ensure minimum length
      const finalPassword = tempPassword.length < 10 ? tempPassword + crypto.randomBytes(4).toString('hex').slice(0, 2) : tempPassword

      user.password = finalPassword
      user.updatedAt = dateTime
      await user.save()

      // Load personal data for email
      await user.load('personalData')
      const full_name = user.personalData ? `${user.personalData.names} ${user.personalData.lastNameP} ${user.personalData.lastNameM}` : 'Usuario'

      try {
        await mail.sendLater((message) => {
          message
            .to(user.email)
            .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
            .subject('SIGMI - Contraseña Restablecida')
            .htmlView('emails/user_password_recovery', {
              full_name,
              password: finalPassword,
              time: dateTime.toISO()
            })
        })
      } catch (error) {
        console.error('Failed to send email:', error)
      }

      return response.status(200).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.password_reset_success'),
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
  }
}