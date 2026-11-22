export type BillingPeriod = 'MONTHLY' | 'YEARLY' | 'EVERY_N_DAYS'
export type MovementType = 'INCOME' | 'EXPENSE'

export interface MoneyMovementInput {
  description: string
  amount: number
  currency: string
  type: MovementType
  category: string
  movementDate: string
  subscriptionId?: string | null
}

export interface MoneyMovement extends MoneyMovementInput {
  id: string
  subscriptionId: string | null
}

export interface SubscriptionInput {
  name: string
  amount: number
  currency: string
  billingPeriod: BillingPeriod
  intervalDays: number | null
  category: string
  nextChargeDate: string
}

export interface Subscription {
  id: string
  name: string
  amount: number
  currency: string
  billingPeriod: BillingPeriod
  intervalDays: number | null
  category: string
  nextChargeDate: string
  active: boolean
}

export interface CategoryTotals {
  category: string
  monthlyTotal: number
  annualTotal: number
}

export interface CurrencyTotals {
  currency: string
  monthlyTotal: number
  annualTotal: number
  categories: CategoryTotals[]
}

export interface Summary {
  currencies: CurrencyTotals[]
}

export interface UpcomingCharge {
  id: string
  name: string
  amount: number
  currency: string
  billingPeriod: BillingPeriod
  intervalDays: number | null
  category: string
  nextChargeDate: string
  daysUntilCharge: number
}
