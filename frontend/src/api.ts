import type { Subscription, SubscriptionInput, Summary, UpcomingCharge } from './types'

async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    throw new Error(`La API respondió con el estado ${response.status}.`)
  }

  return response.json() as Promise<T>
}

export async function getDashboardData(signal: AbortSignal) {
  const [subscriptions, summary, upcomingCharges] = await Promise.all([
    getJson<Subscription[]>('/api/subscriptions', signal),
    getJson<Summary>('/api/summary', signal),
    getJson<UpcomingCharge[]>('/api/subscriptions/upcoming', signal),
  ])

  return { subscriptions, summary, upcomingCharges }
}

export async function createSubscription(input: SubscriptionInput): Promise<Subscription> {
  const response = await fetch('/api/subscriptions', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string; message?: string } | null
    throw new Error(problem?.detail ?? problem?.message ?? `No se pudo guardar (HTTP ${response.status}).`)
  }

  return response.json() as Promise<Subscription>
}
