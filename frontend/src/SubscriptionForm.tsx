import { useState, type FormEvent } from 'react'
import type { BillingPeriod, Subscription, SubscriptionInput } from './types'
import { isoDateToDmy, parseDmyDateToIso, todayAsIsoDate } from './dateUtils'

interface SubscriptionFormProps {
  initialValue?: Subscription
  onCancel: () => void
  onSave: (input: SubscriptionInput) => Promise<void>
}

function SubscriptionForm({ initialValue, onCancel, onSave }: SubscriptionFormProps) {
  const [name, setName] = useState(initialValue?.name ?? '')
  const [amount, setAmount] = useState(initialValue ? String(initialValue.amount) : '')
  const [currency, setCurrency] = useState(initialValue?.currency ?? 'EUR')
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(initialValue?.billingPeriod ?? 'MONTHLY')
  const [intervalDays, setIntervalDays] = useState(String(initialValue?.intervalDays ?? 30))
  const [category, setCategory] = useState(initialValue?.category ?? '')
  const [nextChargeDate, setNextChargeDate] = useState(
    isoDateToDmy(initialValue?.nextChargeDate ?? todayAsIsoDate()),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedNextChargeDate = parseDmyDateToIso(nextChargeDate)
    if (!parsedNextChargeDate) {
      setError('Escribe una fecha válida con el formato DD/MM/AAAA.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSave({
        name: name.trim(),
        amount: Number(amount),
        currency: currency.trim().toUpperCase(),
        billingPeriod,
        intervalDays: billingPeriod === 'EVERY_N_DAYS' ? Number(intervalDays) : null,
        category: category.trim(),
        nextChargeDate: parsedNextChargeDate,
      })
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo guardar la suscripción.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel form-panel" aria-labelledby="form-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{initialValue ? 'EDITAR REGISTRO' : 'NUEVO REGISTRO'}</p>
          <h2 id="form-title">{initialValue ? 'Editar suscripción' : 'Añadir suscripción'}</h2>
        </div>
        <button className="text-button" type="button" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
      </div>

      <form className="subscription-form" onSubmit={handleSubmit}>
        <label className="form-field form-field-wide">
          <span>Nombre del servicio</span>
          <input
            autoFocus
            autoComplete="off"
            maxLength={120}
            placeholder="Por ejemplo, Spotify"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Importe por cobro</span>
          <div className="amount-input">
            <input
              inputMode="decimal"
              max="9999999999.99"
              min="0.01"
              placeholder="9,99"
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
          <span>Frecuencia</span>
          <select
            value={billingPeriod}
            onChange={(event) => setBillingPeriod(event.target.value as BillingPeriod)}
          >
            <option value="MONTHLY">Mensual</option>
            <option value="YEARLY">Anual</option>
            <option value="EVERY_N_DAYS">Cada X días</option>
          </select>
        </label>

        {billingPeriod === 'EVERY_N_DAYS' && (
          <label className="form-field">
            <span>Cada cuántos días</span>
            <input
              max="3650"
              min="1"
              placeholder="24"
              required
              step="1"
              type="number"
              value={intervalDays}
              onChange={(event) => setIntervalDays(event.target.value)}
            />
          </label>
        )}

        <label className="form-field">
          <span>Categoría</span>
          <input
            maxLength={80}
            placeholder="Por ejemplo, Música"
            required
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Próximo cobro</span>
          <input
            autoComplete="off"
            inputMode="numeric"
            maxLength={10}
            placeholder="DD/MM/AAAA"
            required
            title="Escribe la fecha como día/mes/año, por ejemplo 24/12/2026."
            type="text"
            value={nextChargeDate}
            onChange={(event) => setNextChargeDate(event.target.value)}
          />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : initialValue ? 'Guardar cambios' : 'Guardar suscripción'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default SubscriptionForm
