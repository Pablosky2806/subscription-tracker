import { useEffect, useState } from 'react'
import { importMoneyMovements } from './api'
import { isoDateToDmy, todayAsIsoDate } from './dateUtils'
import { parseMovementCsv, type ParsedCsvMovement } from './movementCsv'
import type { MoneyMovement, MoneyMovementInput } from './types'

interface PreviewRow extends ParsedCsvMovement {
  duplicate: boolean
  selected: boolean
}

interface MovementCsvImportProps {
  file: File
  existingMovements: MoneyMovement[]
  onCancel: () => void
  onComplete: (count: number) => Promise<void>
}

function movementKey(movement: MoneyMovementInput) {
  const description = movement.description.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return [movement.movementDate, description, movement.amount.toFixed(2), movement.currency, movement.type].join('|')
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function downloadCsvTemplate() {
  const date = isoDateToDmy(todayAsIsoDate())
  const template = [
    '\uFEFFFecha;Descripción;Importe;Moneda;Tipo;Categoría',
    `${date};Compra supermercado;-42,30;EUR;Gasto;Alimentación`,
    `${date};Nómina;1800,00;EUR;Ingreso;Trabajo`,
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([template], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'plantilla-movimientos.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function MovementCsvImport({ file, existingMovements, onCancel, onComplete }: MovementCsvImportProps) {
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skippedState, setSkippedState] = useState(0)
  const [skippedExchange, setSkippedExchange] = useState(0)
  const [revolutFormat, setRevolutFormat] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function readFile() {
      setLoading(true)
      setError(null)
      try {
        if (file.size > 5 * 1024 * 1024) throw new Error('El archivo supera el límite de 5 MB.')
        const parsed = parseMovementCsv(await file.text())
        const seen = new Set(existingMovements.map(movementKey))
        const preview = parsed.movements.map(({ id, lineNumber, movement }) => {
          const key = movementKey(movement)
          const duplicate = seen.has(key)
          seen.add(key)
          return { id, lineNumber, movement, duplicate, selected: !duplicate }
        })
        if (!cancelled) {
          setRows(preview)
          setSkippedState(parsed.skippedState)
          setSkippedExchange(parsed.skippedExchange)
          setRevolutFormat(parsed.revolutFormat)
        }
      } catch (fileError: unknown) {
        if (!cancelled) setError(fileError instanceof Error ? fileError.message : 'No se pudo leer el CSV.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void readFile()
    return () => { cancelled = true }
  }, [existingMovements, file])

  const selectedCount = rows.filter((row) => row.selected).length
  const duplicateCount = rows.filter((row) => row.duplicate).length

  function selectAll(includeDuplicates: boolean) {
    setRows((current) => current.map((row) => ({
      ...row,
      selected: includeDuplicates || !row.duplicate,
    })))
  }

  function toggleRow(id: string) {
    setRows((current) => current.map((row) => row.id === id
      ? { ...row, selected: !row.selected }
      : row))
  }

  async function handleImport() {
    const selected = rows.filter((row) => row.selected).map((row) => row.movement)
    if (selected.length === 0) return
    setImporting(true)
    setError(null)
    try {
      const imported = await importMoneyMovements(selected)
      await onComplete(imported)
    } catch (importError: unknown) {
      setError(importError instanceof Error ? importError.message : 'No se pudo importar el archivo.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="csv-import-panel" aria-labelledby="csv-import-title">
      <div className="csv-import-heading">
        <div>
          <p className="eyebrow">IMPORTACIÓN LOCAL</p>
          <h3 id="csv-import-title">Vista previa: {file.name}</h3>
        </div>
        <button className="text-button" type="button" onClick={onCancel} disabled={importing}>Cancelar</button>
      </div>
      <p className="csv-import-help">
        El archivo se lee en este navegador. Se aceptan fechas DD/MM/AAAA o AAAA-MM-DD, importes con coma o punto decimal y separadores de coma o punto y coma. {revolutFormat ? 'En el formato de Revolut se usa la fecha de liquidación, se omiten operaciones no completadas y cambios entre divisas, y cada comisión se añade como gasto.' : 'Si no hay tipo, los importes negativos son gastos y los positivos ingresos.'}
      </p>
      <div className="csv-template-actions">
        <button className="secondary-button" type="button" onClick={downloadCsvTemplate}>Descargar plantilla CSV</button>
        <span>Columnas necesarias: Fecha, Descripción, Importe, Moneda.</span>
      </div>

      {loading ? <p className="loading-message">Leyendo archivo…</p> : error && rows.length === 0 ? (
        <p className="csv-import-error" role="alert">{error}</p>
      ) : (
        <>
          {error && <p className="csv-import-error" role="alert">{error}</p>}
          <div className="csv-import-summary">
            <span>{rows.length} movimientos encontrados</span>
            <span>{duplicateCount} posibles duplicados</span>
            <span>{selectedCount} seleccionados</span>
            {skippedState > 0 && <span>{skippedState} pendientes o no completados omitidos</span>}
            {skippedExchange > 0 && <span>{skippedExchange} cambios entre divisas omitidos</span>}
          </div>
          <div className="csv-selection-actions">
            <button className="text-button" type="button" onClick={() => selectAll(false)}>Seleccionar solo nuevos</button>
            <button className="text-button" type="button" onClick={() => selectAll(true)}>Seleccionar todos</button>
          </div>
          <ul className="csv-preview-list" aria-label="Vista previa de movimientos">
            {rows.map((row) => (
              <li className={`csv-preview-row${row.duplicate ? ' is-duplicate' : ''}`} key={row.id}>
                <input
                  type="checkbox"
                  aria-label={`Importar fila ${row.lineNumber}: ${row.movement.description}`}
                  checked={row.selected}
                  onChange={() => toggleRow(row.id)}
                  disabled={importing}
                />
                <time dateTime={row.movement.movementDate}>{isoDateToDmy(row.movement.movementDate)}</time>
                <span className="csv-preview-description">
                  <strong>{row.movement.description}</strong>
                  <small>{row.movement.category} · {row.movement.type === 'INCOME' ? 'Ingreso' : 'Gasto'}</small>
                </span>
                <strong className={row.movement.type === 'INCOME' ? 'is-income' : 'is-expense'}>
                  {row.movement.type === 'INCOME' ? '+' : '−'}{formatMoney(row.movement.amount, row.movement.currency)}
                </strong>
                {row.duplicate && <span className="csv-duplicate-label">Posible duplicado</span>}
              </li>
            ))}
          </ul>
          <div className="csv-import-footer">
            <button className="primary-button" type="button" disabled={loading || importing || selectedCount === 0} onClick={handleImport}>
              {importing ? 'Importando…' : `Importar ${selectedCount} movimientos`}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

export default MovementCsvImport
