import { useState, type FormEvent } from 'react'
import type { BillingPeriod, Subscription, SubscriptionInput } from './types'

const categories = ['Entretenimiento', 'Música', 'Software', 'Almacenamiento', 'Salud', 'Otros']

interface SubscriptionFormProps {
  initialValue?: Subscription
  onCancel: () => void
  onSave: (input: SubscriptionInput) => Promise<void>
}

function localToday() {
  const today = new Date()
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset())
  return today.toISOString().slice(0, 10)
}

function SubscriptionForm({ initialValue, onCancel, onSave }: SubscriptionFormProps) {
  const [name, setName] = useState(initialValue?.name ?? '')
  const [amount, setAmount] = useState(initialValue ? String(initialValue.amount) : '')
  const [currency, setCurrency] = useState(initialValue?.currency ?? 'EUR')
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(initialValue?.billingPeriod ?? 'MONTHLY')
  const [category, setCategory] = useState(initialValue?.category ?? '')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [customCategory, setCustomCategory] = useState(
    Boolean(initialValue && !categories.includes(initialValue.category)),
  )
  const [nextChargeDate, setNextChargeDate] = useState(initialValue?.nextChargeDate ?? localToday)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      await onSave({
        name: name.trim(),
        amount: Number(amount),
        currency: currency.trim().toUpperCase(),
        billingPeriod,
        category: category.trim(),
        nextChargeDate,
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
          </select>
        </label>

        <label className="form-field">
          <span>Categoría</span>
          <div className="category-picker">
            <button
              className={`category-picker-trigger${categoryOpen ? ' is-open' : ''}`}
              type="button"
              aria-haspopup="listbox"
              aria-expanded={categoryOpen}
              aria-controls="subscription-category-options"
              onClick={() => setCategoryOpen((open) => !open)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setCategoryOpen(false)
              }}
            >
              <span className={category ? '' : 'category-placeholder'}>
                {category || 'Seleccionar categoría'}
              </span>
              <svg aria-hidden="true" viewBox="0 0 20 20">
                <path d="m5 7.5 5 5 5-5" />
              </svg>
            </button>
            {categoryOpen && (
              <div id="subscription-category-options" className="category-menu" role="listbox" aria-label="Categorías">
                {categories.map((option) => (
                  <button
                    className={`category-option${category === option && !customCategory ? ' is-selected' : ''}`}
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={category === option && !customCategory}
                    onClick={() => {
                      setCategory(option)
                      setCustomCategory(false)
                      setCategoryOpen(false)
                    }}
                  >
                    <span className="category-option-mark" aria-hidden="true">{option.slice(0, 1)}</span>
                    {option}
                    {category === option && !customCategory && <span className="category-check" aria-hidden="true">✓</span>}
                  </button>
                ))}
                <button
                  className={`category-option custom-category-option${customCategory ? ' is-selected' : ''}`}
                  type="button"
                  role="option"
                  aria-selected={customCategory}
                  onClick={() => {
                    setCustomCategory(true)
                    setCategory((current) => categories.includes(current) ? '' : current)
                    setCategoryOpen(false)
                  }}
                >
                  <span className="category-option-mark custom-mark" aria-hidden="true">+</span>
                  Personalizada
                  {customCategory && <span className="category-check" aria-hidden="true">✓</span>}
                </button>
              </div>
            )}
          </div>
          {customCategory && (
            <input
              autoFocus
              maxLength={80}
              placeholder="Escribe una categoría"
              required
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          )}
        </label>

        <label className="form-field">
          <span>Próximo cobro</span>
          <input
            required
            type="date"
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
