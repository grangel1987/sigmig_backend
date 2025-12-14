import Buget from '#models/bugets/buget'
import ws from '#services/ws'
import app from '@adonisjs/core/services/app'
import { Server, Socket } from 'socket.io'


export const roomForToken = (token: string) => `budget/${token}`
app.ready(() => {
    ws.boot()
    const io = ws.io

    registerSocketEvents(io!)

})



const safeAck = (ack?: any, payload?: any) => {
    if (typeof ack === 'function') ack(payload)
}

async function joinBudgetRoom(socket: Socket, token: string, ack?: any) {
    if (!token) {
        safeAck(ack, { ok: false, error: 'missing_token' })
        return
    }

    const budget = await Buget.query()
        .where('token', token)
        .where('enabled', true)
        .select(['id', 'token'])
        .first()

    if (!budget) {
        safeAck(ack, { ok: false, error: 'budget_not_found' })
        return
    }

    const room = roomForToken(budget.token!)
    await socket.join(room)
    safeAck(ack, { ok: true, room, budgetId: budget.id })
}

async function leaveBudgetRoom(socket: Socket, token: string, ack?: any) {
    if (!token) {
        safeAck(ack, { ok: false, error: 'missing_token' })
        return
    }
    const room = roomForToken(token)
    await socket.leave(room)
    safeAck(ack, { ok: true, room })
}

export function registerSocketEvents(io: Server) {
    io.on('connection', (socket) => {
        socket.on('budget/join', async ({ token }, ack) => {
            try {
                await joinBudgetRoom(socket, token, ack)
            } catch (error) {
                console.error('budget/join error', error)
                safeAck(ack, { ok: false, error: 'unexpected_error' })
            }
        })

        socket.on('budget/leave', async ({ token }, ack) => {
            try {
                await leaveBudgetRoom(socket, token, ack)
            } catch (error) {
                console.error('budget/leave error', error)
                safeAck(ack, { ok: false, error: 'unexpected_error' })
            }
        })
    })
}