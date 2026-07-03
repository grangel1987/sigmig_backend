import { BaseCommand } from '@adonisjs/core/ace'
import Buget from '#models/bugets/buget'
import Client from '#models/clients/client'
import BusinessUser from '#models/business/business_user'

export default class TestReceivables extends BaseCommand {
  public static commandName = 'test:receivables'
  public static options = { startApp: true }

  public async run() {
    const budget = await Buget.find(936)
    if (!budget) {
        this.logger.error("Budget 936 not found")
        return
    }

    const client = await Client.first()
    if (!client) {
        this.logger.error("No clients found")
        return
    }
    
    budget.clientId = client.id
    await budget.save()
    this.logger.info(`Assigned Client ${client.name} to Budget 936`)

    const targetBusinessId = budget.businessId
    
    const businessUser = await BusinessUser.query().where('business_id', targetBusinessId).preload('user').first()
    const user = businessUser!.user
    user.password = 'TestPwd1234'
    await user.save()

    const loginRes = await fetch('http://localhost:3334/api/v2/account/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'TestPwd1234' })
    })

    const loginData = await loginRes.json()
    const token = loginData.accessToken?.token || loginData.accessToken

    const res = await fetch('http://localhost:3334/api/v2/dashboard/receivables', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Business': targetBusinessId.toString()
      }
    })

    const data = await res.json()
    console.log(JSON.stringify(data, null, 2))
  }
}