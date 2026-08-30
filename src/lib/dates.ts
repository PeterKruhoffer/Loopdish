import type { Language } from './i18n'

export type Day = {
  date: string
  weekday: string
  dayNumber: string
  month: string
  isToday: boolean
}

export function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function makeWeek(language: Language, weekOffset = 0, today = new Date()): Day[] {
  const monday = new Date(today)
  const offset = (today.getDay() + 6) % 7
  monday.setDate(today.getDate() - offset + weekOffset * 7)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return {
      date: localDateKey(date),
      weekday: date.toLocaleDateString(language, { weekday: 'short' }),
      dayNumber: String(date.getDate()),
      month: date.toLocaleDateString(language, { month: 'short' }),
      isToday: localDateKey(date) === localDateKey(today),
    }
  })
}

export function friendlyDate(value: string, language: Language) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(language, {
    month: 'short',
    day: 'numeric',
  })
}
