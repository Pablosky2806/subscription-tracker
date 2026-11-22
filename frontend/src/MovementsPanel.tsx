import { useEffect, useRef, useState } from 'react'
import { createMoneyMovement, deleteMoneyMovement, getMoneyMovements, updateMoneyMovement } from './api'
import { isoDateToDmy, todayAsIsoDate } from './dateUtils'
import type { MoneyMovement, MoneyMovementInput, Subscription } from './types'
import MovementForm from './MovementForm'
import MovementCsvImport from './MovementCsvImport'

interface CategoryAmount {
  category: string
  amount: number
}

interface CurrencyMonthSummary {
  currency: string
  income: number
  expense: number
  incomeCategories: CategoryAmount[]
  expenseCategories: CategoryAmount[]
}

interface LinkedChargeSummary {
  subscriptionId: string
  name: string
  currency: string
  count: number
  total: number
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function summarizeMonth(movements: MoneyMovement[], month: string): CurrencyMonthSummary[] {
  const groups = new Map<string, {
    income: number
    expense: number
    incomeCategories: Map<string, number>
    expenseCategories: Map<string, number>
  }>()

  for (const movement of movements) {
    if (!movement.movementDate.startsWith(month)) continue
    const group = groups.get(movement.currency) ?? {
      income: 0,
      expense: 0,
      incomeCategories: new Map<string, number>(),
      expenseCategories: new Map<string, number>(),
    }
    const categories = movement.type === 'INCOME' ? group.incomeCategories : group.expenseCategories
    categories.set(movement.category, (categories.get(movement.category) ?? 0) + movement.amount)
    if (movement.type === 'INCOME') group.income += movement.amount
    else group.expense += movement.amount
    groups.set(movement.currency, group)
  }

  const toCategoryAmounts = (categories: Map<string, number>) => Array.from(categories, ([category, amount]) => ({
    category,
    amount,
  })).sort((first, second) => second.amount - first.amount)

  return Array.from(groups, ([currency, totals]) => ({
    currency,
    income: totals.income,
    expense: totals.expense,
    incomeCategories: toCategoryAmounts(totals.incomeCategories),
    expenseCategories: toCategoryAmounts(totals.expenseCategories),
  })).sort((first, second) => first.currency.localeCompare(second.currency))
}

function summarizeLinkedCharges(
  movements: MoneyMovement[],
  month: string,
  subscriptions: Subscription[],
): LinkedChargeSummary[] {
  const subscriptionNames = new Map(subscriptions.map((subscription) => [subscription.id, subscription.name]))
  const groups = new Map<string, LinkedChargeSummary>()

  for (const movement of movements) {
    if (!movement.movementDate.startsWith(month) || movement.type !== 'EXPENSE' || !movement.subscriptionId) continue
    const key = `${movement.subscriptionId}|${movement.currency}`
    const group = groups.get(key) ?? {
      subscriptionId: movement.subscriptionId,
      name: subscriptionNames.get(movement.subscriptionId) ?? 'Suscripción archivada',
      currency: movement.currency,
      count: 0,
      total: 0,
    }
    group.count += 1
    group.total += movement.amount
    groups.set(key, group)
  }

  return Array.from(groups.values()).sort((first, second) =>
    first.currency.localeCompare(second.currency) || second.total - first.total || first.name.localeCompare(second.name, 'es'))
}

function changeMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber - 1 + amount, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
    .format(new Date(year, monthNumber - 1, 1))
}

function CategoryBars({
  title,
  categories,
  currency,
  tone,
}: {
  title: string
  categories: CategoryAmount[]
  currency: string
  tone: 'income' | 'expense'
}) {
  if (categories.length === 0) {
    return <div className="movement-category-chart"><h4>{title}</h4><p className="monthly-no-data">Sin movimientos este mes.</p></div>
  }

  const maximum = Math.max(...categories.map((item) => item.amount))
  return (
    <div className="movement-category-chart">
      <h4>{title}</h4>
      <ul className="movement-category-list">
        {categories.map((item) => (
          <li key={item.category}>
            <div className="category-line">
              <span>{item.category}</span>
              <strong>{formatMoney(item.amount, currency)}</strong>
            </div>
            <div className={`progress-track movement-progress ${tone}`} aria-hidden="true">
              <span style={{ width: `${(item.amount / maximum) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MovementsPanel({ refreshKey = 0, subscriptions = [] }: { refreshKey?: number; subscriptions?: Subscription[] }) {
  const [movements, setMovements] = useState<MoneyMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingMovement, setEditingMovement] = useState<MoneyMovement | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(() => todayAsIsoDate().slice(0, 7))
  const [listMonth, setListMonth] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState('')
  const monthlySummaries = summarizeMonth(movements, selectedMonth)
  const linkedChargeSummaries = summarizeLinkedCharges(movements, selectedMonth, subscriptions)
  const categories = Array.from(new Set(movements.map((movement) => movement.category)))
    .sort((first, second) => first.localeCompare(second, 'es'))
  const subscriptionsById = new Map(subscriptions.map((subscription) => [subscription.id, subscription]))
  const normalizedSearch = search.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const filteredMovements = movements.filter((movement) => {
    const linkedSubscription = movement.subscriptionId ? subscriptionsById.get(movement.subscriptionId) : undefined
    const normalizedText = `${movement.description} ${movement.category} ${linkedSubscription?.name ?? ''}`
      .toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return (!normalizedSearch || normalizedText.includes(normalizedSearch))
      && (!listMonth || movement.movementDate.startsWith(listMonth))
      && (typeFilter === 'ALL' || movement.type === typeFilter)
      && (!categoryFilter || movement.category === categoryFilter)
  })
  const filtersActive = Boolean(search || listMonth || categoryFilter || typeFilter !== 'ALL')

  function resetFilters() {
    setSearch('')
    setListMonth('')
    setCategoryFilter('')
    setTypeFilter('ALL')
  }

  useEffect(() => {
    const controller = new AbortController()

    getMoneyMovements(controller.signal)
      .then(setMovements)
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los movimientos.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [refreshKey])

  async function handleSave(input: MoneyMovementInput) {
    const saved = editingMovement
      ? await updateMoneyMovement(editingMovement.id, input)
      : await createMoneyMovement(input)
    setMovements((current) => [...current.filter((item) => item.id !== saved.id), saved]
      .sort((first, second) => second.movementDate.localeCompare(first.movementDate)))
    setFormOpen(false)
    setEditingMovement(null)
    setError(null)
    setNotice(editingMovement
      ? `${saved.description} se ha actualizado.`
      : `${saved.description} se ha guardado.`)
  }

  async function handleDelete(movement: MoneyMovement) {
    const shouldDelete = window.confirm(`¿Borrar el movimiento «${movement.description}»?`)
    if (!shouldDelete) return

    setBusyId(movement.id)
    setError(null)
    setNotice(null)
    try {
      await deleteMoneyMovement(movement.id)
      setMovements((current) => current.filter((item) => item.id !== movement.id))
      setNotice('Movimiento borrado.')
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo borrar el movimiento.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleImportComplete(count: number) {
    setImportBusy(true)
    try {
      const refreshed = await getMoneyMovements(new AbortController().signal)
      setMovements(refreshed)
      setCsvFile(null)
      setNotice(`${count} movimientos importados.`)
      setError(null)
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Se importaron los movimientos, pero no se pudo actualizar la lista.')
    } finally {
      setImportBusy(false)
    }
  }

  return (
    <section className="panel movements-panel" aria-labelledby="movements-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">GASTOS E INGRESOS</p>
          <h2 id="movements-title">Movimientos</h2>
        </div>
        <div className="movement-heading-actions">
          {!loading && <span className="count-pill">{movements.length}</span>}
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept=".csv,text/csv"
            aria-label="Seleccionar archivo CSV de movimientos"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              if (!file) return
              setNotice(null)
              setError(null)
              setFormOpen(false)
              setCsvFile(file)
            }}
          />
          {!formOpen && !csvFile && (
            <button className="secondary-button" type="button" disabled={loading || importBusy} onClick={() => fileInputRef.current?.click()}>
              Importar CSV
            </button>
          )}
          {!formOpen && (
            <button className="primary-button" type="button" onClick={() => {
              setEditingMovement(null)
              setError(null)
              setNotice(null)
              setFormOpen(true)
            }}>
              <span aria-hidden="true">+</span> Añadir movimiento
            </button>
          )}
        </div>
      </div>

      {notice && <div className="success-banner" role="status">{notice}</div>}
      {error && <div className="error-banner" role="alert"><span>{error}</span></div>}

      <section className="movement-analytics" aria-labelledby="monthly-summary-title">
        <div className="monthly-summary-heading">
          <div>
            <p className="eyebrow">RESUMEN</p>
            <h3 id="monthly-summary-title">Ingresos y gastos</h3>
          </div>
          <div className="month-navigation" aria-label="Seleccionar mes">
            <button type="button" aria-label="Mes anterior" onClick={() => setSelectedMonth((month) => changeMonth(month, -1))}>‹</button>
            <span>{monthLabel(selectedMonth)}</span>
            <button type="button" aria-label="Mes siguiente" onClick={() => setSelectedMonth((month) => changeMonth(month, 1))}>›</button>
          </div>
        </div>

        {loading ? <p className="loading-message">Calculando resumen…</p> : monthlySummaries.length === 0 ? (
          <p className="monthly-no-data">No hay movimientos en {monthLabel(selectedMonth)}.</p>
        ) : (
          <div className="monthly-currency-groups">
            {monthlySummaries.map((summary) => {
              const net = summary.income - summary.expense
              const largestTotal = Math.max(summary.income, summary.expense, 1)
              return (
                <div className="monthly-currency-group" key={summary.currency}>
                  {monthlySummaries.length > 1 && <span className="currency-label">{summary.currency}</span>}
                  <div className="monthly-flow-cards">
                    <article className="monthly-flow-card income">
                      <span>Ingresos</span>
                      <strong>{formatMoney(summary.income, summary.currency)}</strong>
                    </article>
                    <article className="monthly-flow-card expense">
                      <span>Gastos</span>
                      <strong>{formatMoney(summary.expense, summary.currency)}</strong>
                    </article>
                    <article className="monthly-flow-card balance">
                      <span>Diferencia</span>
                      <strong>{formatMoney(net, summary.currency)}</strong>
                    </article>
                  </div>
                  <div className="monthly-flow-chart" aria-label={`Comparación de ingresos y gastos en ${summary.currency}`}>
                    <div className="monthly-flow-row">
                      <span>Ingresos</span>
                      <div className="progress-track movement-progress income" aria-hidden="true">
                        <span style={{ width: `${(summary.income / largestTotal) * 100}%` }} />
                      </div>
                      <strong>{formatMoney(summary.income, summary.currency)}</strong>
                    </div>
                    <div className="monthly-flow-row">
                      <span>Gastos</span>
                      <div className="progress-track movement-progress expense" aria-hidden="true">
                        <span style={{ width: `${(summary.expense / largestTotal) * 100}%` }} />
                      </div>
                      <strong>{formatMoney(summary.expense, summary.currency)}</strong>
                    </div>
                  </div>
                  <div className="movement-category-breakdown">
                    <CategoryBars title="Ingresos por categoría" categories={summary.incomeCategories} currency={summary.currency} tone="income" />
                    <CategoryBars title="Gastos por categoría" categories={summary.expenseCategories} currency={summary.currency} tone="expense" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="linked-charge-panel" aria-labelledby="linked-charges-title">
        <div className="monthly-summary-heading">
          <div>
            <p className="eyebrow">PAGOS REALES</p>
            <h3 id="linked-charges-title">Cargos vinculados a suscripciones</h3>
          </div>
          <span className="linked-charge-month">{monthLabel(selectedMonth)}</span>
        </div>
        {linkedChargeSummaries.length === 0 ? (
          <p className="monthly-no-data">No hay cargos vinculados en este mes. Puedes asociar un movimiento al editarlo o durante la importación CSV.</p>
        ) : (
          <ul className="linked-charge-list">
            {linkedChargeSummaries.map((charge) => (
              <li key={`${charge.subscriptionId}-${charge.currency}`}>
                <span className="linked-charge-service">
                  <strong>{charge.name}</strong>
                  <small>{charge.count} {charge.count === 1 ? 'cargo real' : 'cargos reales'} · {charge.currency}</small>
                </span>
                <strong className="linked-charge-total">{formatMoney(charge.total, charge.currency)}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      {formOpen && <MovementForm
        key={editingMovement?.id ?? 'new-movement'}
        movement={editingMovement ?? undefined}
        subscriptions={subscriptions}
        onCancel={() => {
          setFormOpen(false)
          setEditingMovement(null)
        }}
        onSave={handleSave}
      />}
      {csvFile && <MovementCsvImport
        file={csvFile}
        existingMovements={movements}
        subscriptions={subscriptions}
        onCancel={() => setCsvFile(null)}
        onComplete={handleImportComplete}
      />}

      {loading ? <p className="loading-message">Cargando movimientos…</p> : movements.length === 0 ? (
        <div className="empty-state compact-empty">
          <strong>Aún no hay movimientos</strong>
          <p>Registra un gasto o un ingreso para empezar tu historial.</p>
        </div>
      ) : (
        <>
          <div className="movement-tools">
            <label className="movement-filter-field movement-search-field">
              <span>Buscar</span>
              <input
                type="search"
                placeholder="Concepto o categoría"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="movement-filter-field">
              <span>Mes</span>
              <input type="month" value={listMonth} onChange={(event) => setListMonth(event.target.value)} />
            </label>
            <label className="movement-filter-field">
              <span>Tipo</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>
                <option value="ALL">Todos</option>
                <option value="EXPENSE">Gastos</option>
                <option value="INCOME">Ingresos</option>
              </select>
            </label>
            <label className="movement-filter-field">
              <span>Categoría</span>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="">Todas</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
          </div>
          <div className="movement-filter-summary" aria-live="polite">
            <span>{filteredMovements.length} de {movements.length} movimientos</span>
            {filtersActive && <button className="text-button" type="button" onClick={resetFilters}>Quitar filtros</button>}
          </div>
          {filteredMovements.length === 0 ? (
            <div className="empty-state compact-empty movement-filter-empty">
              <strong>No hay movimientos con esos filtros</strong>
              <p>Prueba con otro mes, tipo o categoría.</p>
            </div>
          ) : (
            <ul className="movement-list">
              {filteredMovements.map((movement) => (
            <li className="movement-row" key={movement.id}>
              <time className="movement-date" dateTime={movement.movementDate}>
                {isoDateToDmy(movement.movementDate)}
              </time>
              <span className={`movement-type-mark ${movement.type === 'INCOME' ? 'is-income' : 'is-expense'}`} aria-hidden="true">
                {movement.type === 'INCOME' ? '+' : '−'}
              </span>
              <div className="row-description">
                <strong>{movement.description}</strong>
                <span>{movement.category} · {movement.type === 'INCOME' ? 'Ingreso' : 'Gasto'}</span>
                {movement.subscriptionId && subscriptionsById.has(movement.subscriptionId) && (
                  <span className="linked-subscription">Suscripción: {subscriptionsById.get(movement.subscriptionId)?.name}</span>
                )}
              </div>
              <strong className={`movement-amount ${movement.type === 'INCOME' ? 'is-income' : 'is-expense'}`}>
                {movement.type === 'INCOME' ? '+' : '−'}{formatMoney(movement.amount, movement.currency)}
              </strong>
              <div className="movement-row-actions">
                <button
                  className="row-action-button"
                  type="button"
                  aria-label={`Editar ${movement.description}`}
                  title="Editar movimiento"
                  disabled={formOpen || busyId === movement.id}
                  onClick={() => {
                    setEditingMovement(movement)
                    setError(null)
                    setNotice(null)
                    setFormOpen(true)
                    setCsvFile(null)
                  }}
                >
                  ✎
                </button>
                <button
                  className="row-action-button delete-action"
                  type="button"
                  aria-label={`Borrar ${movement.description}`}
                  title="Borrar movimiento"
                  disabled={formOpen || busyId === movement.id}
                  onClick={() => handleDelete(movement)}
                >
                  ×
                </button>
              </div>
            </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

export default MovementsPanel
