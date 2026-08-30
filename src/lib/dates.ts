export type Day = {
  date: string
  weekday: string
  dayNumber: string
  month: string
  isToday: boolean
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function makeWeek(): Day[] {
  const today = new Date()
  const monday = new Date(today)
  const offset = (today.getDay() + 6) % 7
  monday.setDate(today.getDate() - offset)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return {
      date: dateKey(date),
      weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
      dayNumber: String(date.getDate()),
      month: date.toLocaleDateString(undefined, { month: 'short' }),
      isToday: dateKey(date) === dateKey(today),
    }
  })
}

export function friendlyDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
