import { describe, expect, it } from 'vite-plus/test'
import { makeWeek } from './dates'

describe('makeWeek', () => {
  it('builds the current and next Monday-to-Sunday weeks', () => {
    const today = new Date('2026-08-30T12:00:00')

    expect(makeWeek('en', 0, today).map((day) => day.date)).toEqual([
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
      '2026-08-28',
      '2026-08-29',
      '2026-08-30',
    ])
    expect(makeWeek('en', 1, today).map((day) => day.date)).toEqual([
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06',
    ])
  })

  it('handles a new year without fixed-length day arithmetic', () => {
    const week = makeWeek('en', 1, new Date('2026-12-31T12:00:00'))

    expect(week[0].date).toBe('2027-01-04')
    expect(week[6].date).toBe('2027-01-10')
    expect(week.some((day) => day.isToday)).toBe(false)
  })
})
