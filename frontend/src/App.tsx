import { useEffect, useState } from 'react'
import { archiveSubscription, createSubscription, getDashboardData, restoreSubscription, updateSubscription } from './api'
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
  onEdit,
  onArchive,
  onRestore,
  busyId,
}: {
  subscriptions: Subscription[]
  onEdit: (subscription: Subscription) => void
  onArchive: (subscription: Subscription) => void
  onRestore: (subscription: Subscription) => void
  busyId: string | null
}) {
  if (subscriptions.length === 0) {
    return (
      <div className="empty-state compact-empty">
        <strong>Tu lista está vacía</strong>
        <p>Usa «Añadir suscripción» para registrar tu primer servicio.</p>
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

  async function refreshDashboard() {
    const data = await getDashboardData(new AbortController().signal)
    setSubscriptions(data.subscriptions)
    setSummary(data.summary)
    setUpcomingCharges(data.upcomingCharges)
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
              <button className="primary-button" type="button" onClick={() => {
                setEditingSubscription(null)
                setNotice(null)
                setFormOpen(true)
              }}>
                <span aria-hidden="true">+</span> Añadir suscripción
              </button>
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
          {loading ? <p className="loading-message">Cargando suscripciones…</p> : (
            <SubscriptionList
              subscriptions={subscriptions}
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
