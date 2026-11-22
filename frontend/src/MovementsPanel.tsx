import { useEffect, useState } from 'react'
import { createMoneyMovement, deleteMoneyMovement, getMoneyMovements } from './api'
import { isoDateToDmy } from './dateUtils'
import type { MoneyMovement, MoneyMovementInput } from './types'
import MovementForm from './MovementForm'

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function MovementsPanel() {
  const [movements, setMovements] = useState<MoneyMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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
  }, [])

  async function handleSave(input: MoneyMovementInput) {
    const created = await createMoneyMovement(input)
    setMovements((current) => [...current, created]
      .sort((first, second) => second.movementDate.localeCompare(first.movementDate)))
    setFormOpen(false)
    setError(null)
    setNotice(`${created.description} se ha guardado.`)
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

  return (
    <section className="panel movements-panel" aria-labelledby="movements-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">GASTOS E INGRESOS</p>
          <h2 id="movements-title">Movimientos</h2>
        </div>
        <div className="movement-heading-actions">
          {!loading && <span className="count-pill">{movements.length}</span>}
          {!formOpen && (
            <button className="primary-button" type="button" onClick={() => {
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

      {formOpen && <MovementForm onCancel={() => setFormOpen(false)} onSave={handleSave} />}

      {loading ? <p className="loading-message">Cargando movimientos…</p> : movements.length === 0 ? (
        <div className="empty-state compact-empty">
          <strong>Aún no hay movimientos</strong>
          <p>Registra un gasto o un ingreso para empezar tu historial.</p>
        </div>
      ) : (
        <ul className="movement-list">
          {movements.map((movement) => (
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
              </div>
              <strong className={`movement-amount ${movement.type === 'INCOME' ? 'is-income' : 'is-expense'}`}>
                {movement.type === 'INCOME' ? '+' : '−'}{formatMoney(movement.amount, movement.currency)}
              </strong>
              <button
                className="row-action-button delete-action"
                type="button"
                aria-label={`Borrar ${movement.description}`}
                title="Borrar movimiento"
                disabled={busyId === movement.id}
                onClick={() => handleDelete(movement)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default MovementsPanel
