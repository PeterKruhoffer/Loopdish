import { ConvexError } from 'convex/values'
import type { Language } from './i18n'

const knownErrors: Record<Language, Record<string, string>> = {
  en: {
    'Give the dish a name': 'Give the dish a name, then try saving it again.',
    'That dish is not available in this household':
      'That dish is no longer available. Pick another dish and try again.',
    'An eaten meal cannot be removed from the plan':
      'This dinner is already in your history, so it cannot be removed from the plan.',
    'That planned meal no longer exists':
      'That dinner is no longer on the plan. Refresh the page to see the latest week.',
    'That dish no longer exists':
      'That dish no longer exists. Refresh the page to see the latest week.',
    'Only the household owner can do that':
      'Only the household owner can make this change. Ask the owner to do it for you.',
    'Give your household a name': 'Give your household a name, then try saving it again.',
    'That invite is not valid': 'This invite is not valid. Ask the sender for a new link.',
    'That invite is no longer available':
      'This invite has expired or has already been used. Ask the sender for a new link.',
    'You already belong to another household':
      'You already belong to another household, so this invite was not used.',
    'You already have a household with saved meals':
      'You already have a household with saved meals, so this invite was not used.',
    'Add a dish before asking for suggestions':
      'Add at least one dish first. Suggestions use your saved dishes for inspiration.',
    'AI suggestions have not been configured yet':
      'Suggestions are not available yet. Your saved dishes and plan have not changed.',
    'This household has used its five AI suggestions for the last 24 hours':
      'Your household has used its five suggestions for today. Try again tomorrow.',
    'Sign in to use LoopDish': 'Your session has ended. Sign in again to continue.',
  },
  da: {
    'Give the dish a name': 'Giv retten et navn, og prøv at gemme den igen.',
    'That dish is not available in this household':
      'Retten er ikke længere tilgængelig. Vælg en anden ret, og prøv igen.',
    'An eaten meal cannot be removed from the plan':
      'Måltidet er allerede i madhistorikken og kan derfor ikke fjernes fra planen.',
    'That planned meal no longer exists':
      'Måltidet er ikke længere på planen. Genindlæs siden for at se den nyeste uge.',
    'That dish no longer exists':
      'Retten findes ikke længere. Genindlæs siden for at se den nyeste uge.',
    'Only the household owner can do that':
      'Kun husstandens ejer kan foretage denne ændring. Bed ejeren om at gøre det.',
    'Give your household a name': 'Giv husstanden et navn, og prøv at gemme igen.',
    'That invite is not valid': 'Invitationen er ugyldig. Bed afsenderen om et nyt link.',
    'That invite is no longer available':
      'Invitationen er udløbet eller allerede brugt. Bed afsenderen om et nyt link.',
    'You already belong to another household':
      'Du er allerede medlem af en anden husstand, så invitationen blev ikke brugt.',
    'You already have a household with saved meals':
      'Du har allerede en husstand med gemte måltider, så invitationen blev ikke brugt.',
    'Add a dish before asking for suggestions':
      'Tilføj mindst én ret først. Forslagene tager udgangspunkt i jeres gemte retter.',
    'AI suggestions have not been configured yet':
      'Forslag er ikke tilgængelige endnu. Jeres gemte retter og madplan er ikke ændret.',
    'This household has used its five AI suggestions for the last 24 hours':
      'Jeres husstand har brugt dagens fem forslag. Prøv igen i morgen.',
    'Sign in to use LoopDish': 'Din session er udløbet. Log ind igen for at fortsætte.',
  },
}

export function userErrorMessage(error: unknown, language: Language, fallback: string) {
  if (error instanceof ConvexError && typeof error.data === 'string') {
    const knownMessage = knownErrors[language][error.data]
    if (knownMessage) return knownMessage

    const duplicate = error.data.match(/^(.+) is already in your dishes$/)
    if (duplicate) {
      return language === 'da'
        ? `${duplicate[1]} er allerede blandt jeres retter. Der blev ikke tilføjet noget.`
        : `${duplicate[1]} is already in your dishes. Nothing was added.`
    }
  }

  console.error('Unexpected LoopDish error', error)
  return fallback
}
