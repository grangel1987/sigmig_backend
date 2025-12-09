
import Buget from '#models/bugets/buget';
import scheduler from 'adonisjs-scheduler/services/main';
import { DateTime } from 'luxon';


scheduler.call(async () => {
    const today = DateTime.now().toSQLDate()!
    await Buget.query()
        .where('enabled', true)
        .whereNotNull('expire_date')
        .where('expire_date', '<=', today)
        .update({ enabled: false })
}).dailyAt('02:00')