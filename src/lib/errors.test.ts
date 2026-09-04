import { ConvexError } from 'convex/values'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { userErrorMessage } from './errors'

describe('userErrorMessage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('translates known errors without logging them', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(userErrorMessage(new ConvexError('Give the dish a name'), 'da', 'fallback')).toBe(
      'Giv retten et navn, og prøv at gemme den igen.',
    )
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('keeps the dish name in duplicate errors', () => {
    expect(
      userErrorMessage(new ConvexError('Tacos is already in your dishes'), 'en', 'fallback'),
    ).toBe('Tacos is already in your dishes. Nothing was added.')
  })

  it('hides and logs unexpected errors', () => {
    const error = new Error('Database connection details')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(userErrorMessage(error, 'en', 'Your dishes have not changed. Try again.')).toBe(
      'Your dishes have not changed. Try again.',
    )
    expect(consoleError).toHaveBeenCalledWith('Unexpected LoopDish error', error)
  })
})
