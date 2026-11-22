import type { MoneyMovement, MoneyMovementInput, Subscription, SubscriptionInput, Summary, UpcomingCharge } from './types'

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
  const [subscriptions, summary] = await Promise.all([
    getJson<Subscription[]>('/api/subscriptions', signal),
    getJson<Summary>('/api/summary', signal),
  ])

  return { subscriptions, summary }
}

export function getUpcomingCharges(days: number, signal: AbortSignal) {
  return getJson<UpcomingCharge[]>(`/api/subscriptions/upcoming?days=${days}`, signal)
}

export function getMoneyMovements(signal: AbortSignal) {
  return getJson<MoneyMovement[]>('/api/movements', signal)
}

export async function createMoneyMovement(input: MoneyMovementInput) {
  const response = await fetch('/api/movements', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string; message?: string } | null
    throw new Error(problem?.detail ?? problem?.message ?? `No se pudo guardar el movimiento (HTTP ${response.status}).`)
  }
  return response.json() as Promise<MoneyMovement>
}

export async function importMoneyMovements(movements: MoneyMovementInput[]): Promise<number> {
  const response = await fetch('/api/movements/import', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ movements }),
  })
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string; message?: string } | null
    throw new Error(problem?.detail ?? problem?.message ?? `No se pudieron importar los movimientos (HTTP ${response.status}).`)
  }
  const result = await response.json() as { imported: number }
  return result.imported
}

export async function deleteMoneyMovement(id: string) {
  const response = await fetch(`/api/movements/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string; message?: string } | null
    throw new Error(problem?.detail ?? problem?.message ?? `No se pudo borrar el movimiento (HTTP ${response.status}).`)
  }
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

export async function importSubscriptionBackup(backup: unknown): Promise<{
  imported: number
  skippedExisting: number
  importedMovements: number
  skippedExistingMovements: number
}> {
  const response = await fetch('/api/subscriptions/import', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(backup),
  })
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { detail?: string; message?: string } | null
    throw new Error(problem?.detail ?? problem?.message ?? `No se pudo restaurar la copia (HTTP ${response.status}).`)
  }
  return response.json() as Promise<{
    imported: number
    skippedExisting: number
    importedMovements: number
    skippedExistingMovements: number
  }>
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
