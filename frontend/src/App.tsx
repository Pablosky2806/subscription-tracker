import { useEffect, useState } from 'react'
import { createSubscription, getDashboardData } from './api'
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

function SubscriptionList({ subscriptions }: { subscriptions: Subscription[] }) {
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

  async function handleSave(input: SubscriptionInput) {
    const created = await createSubscription(input)
    setFormOpen(false)
    setError(null)
    setNotice(`${created.name} se ha añadido correctamente.`)

    try {
      const data = await getDashboardData(new AbortController().signal)
      setSubscriptions(data.subscriptions)
      setSummary(data.summary)
      setUpcomingCharges(data.upcomingCharges)
    } catch {
      setError('La suscripción se guardó, pero no se pudo actualizar el panel. Recarga la página.')
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
              <button className="primary-button" type="button" onClick={() => setFormOpen(true)}>
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
            onCancel={() => setFormOpen(false)}
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
          {loading ? <p className="loading-message">Cargando suscripciones…</p> : <SubscriptionList subscriptions={subscriptions} />}
        </section>

        <footer className="footer-note">Tus datos permanecen en tu propio servidor.</footer>
      </main>
    </div>
  )
}

export default App
