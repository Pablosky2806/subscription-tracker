import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { archiveSubscription, createSubscription, getDashboardData, importSubscriptionBackup, restoreSubscription, updateSubscription } from './api'
import type { Subscription, SubscriptionInput, Summary, UpcomingCharge } from './types'
import SubscriptionForm from './SubscriptionForm'
import './App.css'

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T00:00:00`))
}

function downloadBackup(subscriptions: Subscription[]) {
  const backup = {
    format: 'subscription-tracker-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    subscriptions,
  }
  const file = new Blob([`${JSON.stringify(backup, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = `suscripciones-backup-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function relativeChargeDate(days: number) {
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Mañana'
  return `En ${days} días`
}

function CurrencyAmounts({
  values,
  valueKey,
}: {
  values: Summary['currencies']
  valueKey: 'monthlyTotal' | 'annualTotal'
}) {
  if (values.length === 0) {
    return <span className="metric-empty">Sin datos todavía</span>
  }

  return (
    <div className="currency-amounts">
      {values.map((entry) => (
        <span className="currency-amount" key={entry.currency}>
          <strong>{formatMoney(entry[valueKey], entry.currency)}</strong>
          {values.length > 1 && <small>{entry.currency}</small>}
        </span>
      ))}
    </div>
  )
}

function UpcomingList({ charges }: { charges: UpcomingCharge[] }) {
  if (charges.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon" aria-hidden="true">↗</span>
        <strong>No hay cobros próximos</strong>
        <p>Cuando registres suscripciones, aparecerán aquí.</p>
      </div>
    )
  }

  return (
    <ul className="charge-list">
      {charges.map((charge) => (
        <li className="charge-row" key={charge.id}>
          <div className="date-badge">
            <span>{formatDate(charge.nextChargeDate)}</span>
            <small>{relativeChargeDate(charge.daysUntilCharge)}</small>
          </div>
          <div className="row-description">
            <strong>{charge.name}</strong>
            <span>{charge.category}</span>
          </div>
          <strong className="row-amount">{formatMoney(charge.amount, charge.currency)}</strong>
        </li>
      ))}
    </ul>
  )
}

function CategoryBreakdown({ summary }: { summary: Summary }) {
  if (summary.currencies.length === 0) {
    return (
      <div className="empty-state compact-empty">
        <strong>El desglose aparecerá aquí</strong>
        <p>Añade una suscripción para ver el gasto por categoría.</p>
      </div>
    )
  }

  return (
    <div className="category-groups">
      {summary.currencies.map((currencyGroup) => (
        <div className="category-group" key={currencyGroup.currency}>
          {summary.currencies.length > 1 && (
            <div className="currency-label">{currencyGroup.currency}</div>
          )}
          {currencyGroup.categories.map((category) => {
            const percentage = currencyGroup.monthlyTotal > 0
              ? (category.monthlyTotal / currencyGroup.monthlyTotal) * 100
              : 0

            return (
              <div className="category-item" key={`${currencyGroup.currency}-${category.category}`}>
                <div className="category-line">
                  <span>{category.category}</span>
                  <strong>{formatMoney(category.monthlyTotal, currencyGroup.currency)}</strong>
                </div>
                <div className="progress-track" aria-label={`${Math.round(percentage)} % del gasto mensual`}>
                  <span style={{ width: `${percentage}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function SubscriptionList({
  subscriptions,
  emptyState,
  onEdit,
  onArchive,
  onRestore,
  busyId,
}: {
  subscriptions: Subscription[]
  emptyState: 'empty' | 'filtered'
  onEdit: (subscription: Subscription) => void
  onArchive: (subscription: Subscription) => void
  onRestore: (subscription: Subscription) => void
  busyId: string | null
}) {
  if (subscriptions.length === 0) {
    return (
      <div className="empty-state compact-empty">
        <strong>{emptyState === 'empty' ? 'Tu lista está vacía' : 'No hay coincidencias'}</strong>
        <p>{emptyState === 'empty'
          ? 'Usa «Añadir suscripción» para registrar tu primer servicio.'
          : 'Prueba otra búsqueda o cambia el filtro de estado.'}</p>
      </div>
    )
  }

  return (
    <ul className="subscription-list">
      {subscriptions.map((subscription) => (
        <li className={`subscription-row${subscription.active ? '' : ' is-archived'}`} key={subscription.id}>
          <span className="service-mark" aria-hidden="true">{subscription.name.slice(0, 1).toUpperCase()}</span>
          <div className="row-description">
            <strong>{subscription.name}</strong>
            <span>{subscription.category} · {subscription.billingPeriod === 'MONTHLY' ? 'Mensual' : 'Anual'}</span>
          </div>
          <div className="subscription-price">
            <strong>{formatMoney(subscription.amount, subscription.currency)}</strong>
            {!subscription.active && <small>Archivada</small>}
          </div>
          <div className="subscription-actions">
            <button
              className="row-action-button"
              type="button"
              aria-label={`Editar ${subscription.name}`}
              title="Editar"
              disabled={busyId === subscription.id}
              onClick={() => onEdit(subscription)}
            >
              ✎
            </button>
            {subscription.active && (
              <button
                className="row-action-button archive-action"
                type="button"
                aria-label={`Archivar ${subscription.name}`}
                title="Archivar"
                disabled={busyId === subscription.id}
                onClick={() => onArchive(subscription)}
              >
                ↓
              </button>
            )}
            {!subscription.active && (
              <button
                className="row-action-button restore-action"
                type="button"
                aria-label={`Restaurar ${subscription.name}`}
                title="Restaurar"
                disabled={busyId === subscription.id}
                onClick={() => onRestore(subscription)}
              >
                ↥
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

function App() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [summary, setSummary] = useState<Summary>({ currencies: [] })
  const [upcomingCharges, setUpcomingCharges] = useState<UpcomingCharge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [backupBusy, setBackupBusy] = useState(false)
  const backupInputRef = useRef<HTMLInputElement>(null)
  const [subscriptionQuery, setSubscriptionQuery] = useState('')
  const [subscriptionStatus, setSubscriptionStatus] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL')

  const normalizedQuery = subscriptionQuery
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const filteredSubscriptions = subscriptions.filter((subscription) => {
    const matchesStatus = subscriptionStatus === 'ALL'
      || (subscriptionStatus === 'ACTIVE' && subscription.active)
      || (subscriptionStatus === 'ARCHIVED' && !subscription.active)
    const searchableText = `${subscription.name} ${subscription.category}`
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    return matchesStatus && searchableText.includes(normalizedQuery)
  })
  const activeSubscriptionCount = subscriptions.filter((subscription) => subscription.active).length
  const archivedSubscriptionCount = subscriptions.length - activeSubscriptionCount

  async function refreshDashboard() {
    const data = await getDashboardData(new AbortController().signal)
    setSubscriptions(data.subscriptions)
    setSummary(data.summary)
    setUpcomingCharges(data.upcomingCharges)
  }

  async function handleBackupFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    let backup: unknown
    try {
      backup = JSON.parse(await file.text()) as unknown
    } catch {
      setError('El archivo no contiene un JSON válido.')
      return
    }

    const shouldImport = window.confirm(
      'La copia añadirá las suscripciones que todavía no existan. Las que ya tienes se conservarán sin cambios. ¿Continuar?',
    )
    if (!shouldImport) return

    setBackupBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await importSubscriptionBackup(backup)
      await refreshDashboard()
      setNotice(`Copia restaurada: ${result.imported} añadidas y ${result.skippedExisting} ya existentes conservadas.`)
    } catch (importError: unknown) {
      setError(importError instanceof Error ? importError.message : 'No se pudo restaurar la copia.')
    } finally {
      setBackupBusy(false)
    }
  }

  async function handleSave(input: SubscriptionInput) {
    const wasEditing = editingSubscription !== null
    const saved = editingSubscription
      ? await updateSubscription(editingSubscription.id, input)
      : await createSubscription(input)

    setFormOpen(false)
    setEditingSubscription(null)
    setError(null)
    setNotice(wasEditing
      ? `${saved.name} se ha actualizado correctamente.`
      : `${saved.name} se ha añadido correctamente.`)

    try {
      await refreshDashboard()
    } catch {
      setError('El cambio se guardó, pero no se pudo actualizar el panel. Recarga la página.')
    }
  }

  async function handleArchive(subscription: Subscription) {
    const shouldArchive = window.confirm(
      `¿Archivar ${subscription.name}? Dejará de contar en los gastos y próximos cobros, pero no se borrará.`,
    )
    if (!shouldArchive) return

    setBusyId(subscription.id)
    setError(null)
    setNotice(null)

    try {
      const archived = await archiveSubscription(subscription.id)
      setNotice(`${archived.name} se ha archivado.`)
      try {
        await refreshDashboard()
      } catch {
        setError('Se archivó, pero no se pudo actualizar el panel. Recarga la página.')
      }
    } catch (archiveError: unknown) {
      setError(archiveError instanceof Error ? archiveError.message : 'No se pudo archivar la suscripción.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRestore(subscription: Subscription) {
    setBusyId(subscription.id)
    setError(null)
    setNotice(null)

    try {
      const restored = await restoreSubscription(subscription.id)
      setNotice(`${restored.name} se ha restaurado y volverá a contar en los gastos.`)
      try {
        await refreshDashboard()
      } catch {
        setError('Se restauró, pero no se pudo actualizar el panel. Recarga la página.')
      }
    } catch (restoreError: unknown) {
      setError(restoreError instanceof Error ? restoreError.message : 'No se pudo restaurar la suscripción.')
    } finally {
      setBusyId(null)
    }
  }

  useEffect(() => {
    const controller = new AbortController()

    getDashboardData(controller.signal)
      .then((data) => {
        setSubscriptions(data.subscriptions)
        setSummary(data.summary)
        setUpcomingCharges(data.upcomingCharges)
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los datos.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Mis Suscripciones, inicio">
          <span className="brand-mark">S</span>
          <span>suscripciones<span className="brand-period">.</span></span>
        </a>
        <span className="local-badge"><span /> Self-hosted</span>
      </header>

      <main className="dashboard">
        <section className="page-heading">
          <div>
            <p className="eyebrow">VISTA GENERAL</p>
            <h1>Todo bajo control.</h1>
            <p className="page-subtitle">Tus pagos recurrentes, claros de un vistazo.</p>
          </div>
          <div className="heading-actions">
            <div className="today-label">{new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(new Date())}</div>
            {!formOpen && (
              <div className="dashboard-actions">
                <input
                  ref={backupInputRef}
                  accept=".json,application/json"
                  aria-label="Seleccionar archivo de copia de seguridad"
                  className="backup-file-input"
                  type="file"
                  onChange={handleBackupFile}
                />
                <button
                  className="secondary-button"
                  type="button"
                  disabled={backupBusy}
                  onClick={() => backupInputRef.current?.click()}
                >
                  {backupBusy ? 'Restaurando…' : 'Restaurar copia'}
                </button>
                <button className="secondary-button" type="button" onClick={() => downloadBackup(subscriptions)}>
                  Exportar copia
                </button>
                <button className="primary-button" type="button" onClick={() => {
                  setEditingSubscription(null)
                  setNotice(null)
                  setFormOpen(true)
                }}>
                  <span aria-hidden="true">+</span> Añadir suscripción
                </button>
              </div>
            )}
          </div>
        </section>

        {notice && <div className="success-banner" role="status">{notice}</div>}

        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <span>Comprueba que la API esté en marcha.</span>
          </div>
        )}

        {formOpen && (
          <SubscriptionForm
            key={editingSubscription?.id ?? 'new-subscription'}
            initialValue={editingSubscription ?? undefined}
            onCancel={() => {
              setFormOpen(false)
              setEditingSubscription(null)
            }}
            onSave={handleSave}
          />
        )}

        <section className="metrics-grid" aria-label="Resumen de gastos">
          <article className="metric-card metric-card-primary">
            <div className="metric-heading"><span>Gasto mensual</span><span className="metric-icon">↘</span></div>
            {loading ? <span className="metric-loading">Cargando…</span> : (
              <CurrencyAmounts values={summary.currencies} valueKey="monthlyTotal" />
            )}
            <p>Estimación mensual normalizada</p>
          </article>
          <article className="metric-card">
            <div className="metric-heading"><span>Gasto anual</span><span className="metric-icon warm">◷</span></div>
            {loading ? <span className="metric-loading">Cargando…</span> : (
              <CurrencyAmounts values={summary.currencies} valueKey="annualTotal" />
            )}
            <p>Proyección de los próximos 12 meses</p>
          </article>
          <article className="metric-card">
            <div className="metric-heading"><span>Suscripciones activas</span><span className="metric-icon blue">▦</span></div>
            <strong className="metric-number">{loading ? '—' : subscriptions.filter((item) => item.active).length}</strong>
            <p>Servicios que tienes en marcha</p>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel upcoming-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">CALENDARIO</p>
                <h2>Próximos cobros</h2>
              </div>
              <span className="panel-note">30 días</span>
            </div>
            {loading ? <p className="loading-message">Cargando cobros…</p> : <UpcomingList charges={upcomingCharges} />}
          </article>

          <article className="panel category-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">EN QUÉ SE VA</p>
                <h2>Por categoría</h2>
              </div>
              <span className="panel-note">al mes</span>
            </div>
            {loading ? <p className="loading-message">Calculando…</p> : <CategoryBreakdown summary={summary} />}
          </article>
        </section>

        <section className="panel subscriptions-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">TU LISTA</p>
              <h2>Todas las suscripciones</h2>
            </div>
            {!loading && <span className="count-pill">{subscriptions.length}</span>}
          </div>
          {!loading && <div className="subscription-tools">
            <label className="subscription-search">
              <span className="visually-hidden">Buscar suscripciones</span>
              <svg aria-hidden="true" viewBox="0 0 20 20">
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="m13 13 4 4" />
              </svg>
              <input
                type="search"
                placeholder="Buscar por servicio o categoría"
                value={subscriptionQuery}
                onChange={(event) => setSubscriptionQuery(event.target.value)}
              />
            </label>
            <div className="subscription-filters" role="group" aria-label="Filtrar por estado">
              <button
                className={subscriptionStatus === 'ALL' ? 'is-selected' : ''}
                type="button"
                aria-pressed={subscriptionStatus === 'ALL'}
                onClick={() => setSubscriptionStatus('ALL')}
              >
                Todas <span>{subscriptions.length}</span>
              </button>
              <button
                className={subscriptionStatus === 'ACTIVE' ? 'is-selected' : ''}
                type="button"
                aria-pressed={subscriptionStatus === 'ACTIVE'}
                onClick={() => setSubscriptionStatus('ACTIVE')}
              >
                Activas <span>{activeSubscriptionCount}</span>
              </button>
              <button
                className={subscriptionStatus === 'ARCHIVED' ? 'is-selected' : ''}
                type="button"
                aria-pressed={subscriptionStatus === 'ARCHIVED'}
                onClick={() => setSubscriptionStatus('ARCHIVED')}
              >
                Archivadas <span>{archivedSubscriptionCount}</span>
              </button>
            </div>
          </div>}
          {loading ? <p className="loading-message">Cargando suscripciones…</p> : (
            <SubscriptionList
              subscriptions={filteredSubscriptions}
              emptyState={subscriptions.length === 0 ? 'empty' : 'filtered'}
              onEdit={(subscription) => {
                setNotice(null)
                setEditingSubscription(subscription)
                setFormOpen(true)
              }}
              onArchive={handleArchive}
              onRestore={handleRestore}
              busyId={busyId}
            />
          )}
        </section>

        <footer className="footer-note">Tus datos permanecen en tu propio servidor.</footer>
      </main>
    </div>
  )
}

export default App
