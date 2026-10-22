import { addDays } from './date'
import { newId } from './id'
import type { Obligation, ShopData } from './shop'
import type { IsoDate } from './types'

function line(direction: Obligation['direction'], label: string, amount: string, date: IsoDate, note = ''): Obligation {
  return { id: newId(), direction, label, amount, date, note, status: 'open', payments: [] }
}

/** The product's reference case: 50m on hand, buy 30m today, 25m payroll + rent on day 7, 35m platform payout on day 14. */
export function demoShop(today: IsoDate): ShopData {
  return {
    version: 1,
    balance: { amount: '50000000', cutoff: addDays(today, -1) },
    obligations: [
      line('Out', 'Nhập hàng', '30000000', today, 'Lô hàng thu đông'),
      line('Out', 'Lương + tiền thuê', '25000000', addDays(today, 7)),
      line('In', 'Tiền sàn về', '35000000', addDays(today, 14), 'Đợt đối soát giữa tháng'),
    ],
    scenarios: [],
    imports: [],
  }
}
