export type BillingPeriod = 'MONTHLY' | 'YEARLY'

export interface Subscription {
  id: string
  name: string
  amount: number
  currency: string
  billingPeriod: BillingPeriod
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
  category: string
  nextChargeDate: string
  daysUntilCharge: number
}
