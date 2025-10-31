import Coin from '#models/coin/coin'

export default class CoinRepository {
    public static async select() {
        const coins = await Coin.query().select(['id', 'name']).where('enabled', true)
        return coins
    }
}
