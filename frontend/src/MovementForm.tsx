import { useState, type FormEvent } from 'react'
import { isoDateToDmy, parseDmyDateToIso, todayAsIsoDate } from './dateUtils'
import type { MoneyMovementInput, MovementType } from './types'

interface MovementFormProps {
  onCancel: () => void
  onSave: (movement: MoneyMovementInput) => Promise<void>
}

function MovementForm({ onCancel, onSave }: MovementFormProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [type, setType] = useState<MovementType>('EXPENSE')
  const [category, setCategory] = useState('')
  const [movementDate, setMovementDate] = useState(isoDateToDmy(todayAsIsoDate()))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedDate = parseDmyDateToIso(movementDate)
    if (!parsedDate) {
      setError('Escribe una fecha válida con el formato DD/MM/AAAA.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave({
        description: description.trim(),
        amount: Number(amount),
        currency: currency.trim().toUpperCase(),
        type,
        category: category.trim(),
        movementDate: parsedDate,
      })
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="movement-form" onSubmit={handleSubmit}>
      <label className="form-field form-field-wide">
        <span>Concepto</span>
        <input
          autoFocus
          maxLength={120}
          placeholder="Por ejemplo, compra semanal o nómina"
          required
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <label className="form-field">
        <span>Importe</span>
        <div className="amount-input">
          <input
            inputMode="decimal"
            max="9999999999.99"
            min="0.01"
            placeholder="25,00"
            required
            step="0.01"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <span>{currency}</span>
        </div>
      </label>

      <label className="form-field">
        <span>Tipo</span>
        <select value={type} onChange={(event) => setType(event.target.value as MovementType)}>
          <option value="EXPENSE">Gasto</option>
          <option value="INCOME">Ingreso</option>
        </select>
      </label>

      <label className="form-field">
        <span>Moneda</span>
        <input
          autoCapitalize="characters"
          maxLength={3}
          pattern="[A-Za-z]{3}"
          placeholder="EUR"
          required
          title="Escribe un código de moneda de tres letras, como EUR o USD."
          value={currency}
          onChange={(event) => setCurrency(event.target.value.toUpperCase())}
        />
      </label>

      <label className="form-field">
        <span>Categoría</span>
        <input
          maxLength={80}
          placeholder="Por ejemplo, Alimentación"
          required
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
      </label>

      <label className="form-field">
        <span>Fecha</span>
        <input
          autoComplete="off"
          inputMode="numeric"
          maxLength={10}
          placeholder="DD/MM/AAAA"
          required
          title="Escribe la fecha como día/mes/año, por ejemplo 24/12/2026."
          type="text"
          value={movementDate}
          onChange={(event) => setMovementDate(event.target.value)}
        />
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="form-actions">
        <button className="text-button" type="button" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar movimiento'}
        </button>
      </div>
    </form>
  )
}

export default MovementForm
