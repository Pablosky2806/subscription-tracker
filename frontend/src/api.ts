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

async function writeSubscription(path: string, method: 'POST' | 'PUT', input: SubscriptionInput) {
  const response = await fetch(path, {
    method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string; message?: string } | null
    throw new Error(problem?.detail ?? problem?.message ?? `No se pudo guardar (HTTP ${response.status}).`)
  }
  return response.json() as Promise<Subscription>
}

export function createSubscription(input: SubscriptionInput) {
  return writeSubscription('/api/subscriptions', 'POST', input)
}

export function updateSubscription(id: string, input: SubscriptionInput) {
  return writeSubscription(`/api/subscriptions/${encodeURIComponent(id)}`, 'PUT', input)
}

export async function archiveSubscription(id: string): Promise<Subscription> {
  const response = await fetch(`/api/subscriptions/${encodeURIComponent(id)}/archive`, {
    method: 'PATCH',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string; message?: string } | null
    throw new Error(problem?.detail ?? problem?.message ?? `No se pudo archivar (HTTP ${response.status}).`)
  }

  return response.json() as Promise<Subscription>
}

export async function restoreSubscription(id: string): Promise<Subscription> {
  const response = await fetch(`/api/subscriptions/${encodeURIComponent(id)}/restore`, {
    method: 'PATCH',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string; message?: string } | null
    throw new Error(problem?.detail ?? problem?.message ?? `No se pudo restaurar (HTTP ${response.status}).`)
  }

  return response.json() as Promise<Subscription>
}
