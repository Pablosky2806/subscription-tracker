import { parseDmyDateToIso } from './dateUtils'
import type { MoneyMovementInput, MovementType } from './types'

export interface ParsedCsvMovement {
  lineNumber: number
  movement: MoneyMovementInput
}

function normalizeHeader(value: string) {
  return value.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
}

function splitCsv(text: string, delimiter: string) {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === delimiter && !quoted) {
      row.push(field.trim())
      field = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(field.trim())
      if (row.some((cell) => cell.length > 0)) rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }

  row.push(field.trim())
  if (row.some((cell) => cell.length > 0)) rows.push(row)
  if (quoted) throw new Error('Hay un campo entre comillas que no se ha cerrado.')
  return rows
}

function countDelimiters(line: string, delimiter: string) {
  let count = 0
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') quoted = !quoted
    else if (line[index] === delimiter && !quoted) count += 1
  }
  return count
}

function parseAmount(value: string) {
  let normalized = value.trim().replace(/[€$£\s]/g, '')
  const parenthesized = normalized.startsWith('(') && normalized.endsWith(')')
  normalized = normalized.replace(/[()]/g, '').replace(/[^0-9,.+-]/g, '')
  const negative = parenthesized || normalized.startsWith('-')
  normalized = normalized.replace(/[+-]/g, '')

  const comma = normalized.lastIndexOf(',')
  const dot = normalized.lastIndexOf('.')
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? ',' : '.'
    const grouping = decimal === ',' ? /\./g : /,/g
    normalized = normalized.replace(grouping, '')
    if (decimal === ',') normalized = normalized.replace(',', '.')
  } else if (comma >= 0) {
    normalized = /,\d{3}$/.test(normalized) ? normalized.replace(',', '') : normalized.replace(',', '.')
  } else if (/\.\d{3}$/.test(normalized)) {
    normalized = normalized.replace('.', '')
  }

  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return { amount, negative }
}

function parseDate(value: string) {
  const clean = value.trim().split(/[ T]/, 1)[0]
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [year, month, day] = clean.split('-')
    return parseDmyDateToIso(`${day}/${month}/${year}`)
  }
  if (/^\d{2}[-.]\d{2}[-.]\d{4}$/.test(clean)) {
    return parseDmyDateToIso(clean.replace(/[-.]/g, '/'))
  }
  return parseDmyDateToIso(clean)
}

function parseType(value: string): MovementType | null {
  const normalized = normalizeHeader(value)
  if (['income', 'ingreso', 'credit', 'credito', 'abono', 'haber', 'in'].includes(normalized)) return 'INCOME'
  if (['expense', 'gasto', 'debit', 'debito', 'cargo', 'debe', 'out'].includes(normalized)) return 'EXPENSE'
  return null
}

function findColumn(headers: string[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader)
  return headers.findIndex((header) => normalizedAliases.includes(header))
}

export function parseMovementCsv(contents: string): ParsedCsvMovement[] {
  const text = contents.replace(/^\uFEFF/, '').trim()
  if (!text) throw new Error('El archivo está vacío.')

  const firstLine = text.split(/\r?\n/, 1)[0]
  const delimiter = [';', ',', '\t']
    .map((candidate) => ({ candidate, count: countDelimiters(firstLine, candidate) }))
    .sort((first, second) => second.count - first.count)[0].candidate
  const rows = splitCsv(text, delimiter)
  if (rows.length < 2) throw new Error('El CSV debe incluir una cabecera y al menos un movimiento.')

  const headers = rows[0].map(normalizeHeader)
  const dateColumn = findColumn(headers, ['fecha', 'date', 'transaction date', 'operation date', 'completed date', 'started date'])
  const descriptionColumn = findColumn(headers, ['descripción', 'descripcion', 'description', 'concepto', 'concept', 'details', 'merchant', 'counterparty', 'payee'])
  const amountColumn = findColumn(headers, ['importe', 'amount', 'value', 'transaction amount'])
  const currencyColumn = findColumn(headers, ['moneda', 'currency', 'divisa'])
  const typeColumn = findColumn(headers, ['tipo', 'type', 'direction'])
  const categoryColumn = findColumn(headers, ['categoría', 'categoria', 'category'])
  const debitColumn = findColumn(headers, ['debit', 'debito', 'cargo', 'debe', 'outgoing', 'money out'])
  const creditColumn = findColumn(headers, ['credit', 'credito', 'abono', 'haber', 'incoming', 'money in'])

  if (dateColumn < 0 || descriptionColumn < 0 || currencyColumn < 0) {
    throw new Error('Faltan columnas obligatorias: Fecha, Descripción y Moneda.')
  }
  if (amountColumn < 0 && debitColumn < 0 && creditColumn < 0) {
    throw new Error('Añade una columna Importe o las columnas Cargo y Abono.')
  }

  if (rows.length - 1 > 5000) throw new Error('El archivo supera el límite de 5000 movimientos por importación.')

  return rows.slice(1).map((cells, index) => {
    const lineNumber = index + 2
    const cell = (column: number) => column < 0 ? '' : (cells[column] ?? '').trim()
    const movementDate = parseDate(cell(dateColumn))
    if (!movementDate) throw new Error(`Fila ${lineNumber}: la fecha no es válida.`)

    const description = cell(descriptionColumn)
    if (!description || description.length > 120) throw new Error(`Fila ${lineNumber}: revisa la descripción.`)

    const currency = cell(currencyColumn).toUpperCase()
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error(`Fila ${lineNumber}: la moneda debe ser un código de tres letras, como EUR.`)

    const debit = debitColumn < 0 || !cell(debitColumn) ? null : parseAmount(cell(debitColumn))
    const credit = creditColumn < 0 || !cell(creditColumn) ? null : parseAmount(cell(creditColumn))
    const parsedAmount = amountColumn < 0 ? null : parseAmount(cell(amountColumn))
    if (debitColumn >= 0 || creditColumn >= 0) {
      if (debit && credit) throw new Error(`Fila ${lineNumber}: hay importes tanto en Cargo como en Abono.`)
      if (!debit && !credit && !parsedAmount) throw new Error(`Fila ${lineNumber}: falta el importe del movimiento.`)
    }

    const selectedAmount = debit ?? credit ?? parsedAmount
    if (!selectedAmount) throw new Error(`Fila ${lineNumber}: el importe no es válido.`)

    const explicitType = parseType(cell(typeColumn))
    // Bank exports often use this column for details such as "Card" or "Transfer".
    const type = explicitType ?? (debit ? 'EXPENSE' : credit ? 'INCOME' : selectedAmount.negative ? 'EXPENSE' : 'INCOME')
    const category = cell(categoryColumn) || 'Otros'
    if (category.length > 80) throw new Error(`Fila ${lineNumber}: la categoría supera los 80 caracteres.`)

    return {
      lineNumber,
      movement: {
        description,
        amount: selectedAmount.amount,
        currency,
        type,
        category,
        movementDate,
      },
    }
  })
}
