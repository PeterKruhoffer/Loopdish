import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'

export type Language = 'en' | 'da'

const copy = {
  en: {
    loading: 'Loading LoopDish…',
    authEyebrow: 'Dinner, remembered',
    authTitle: 'Your dinner rotation starts here.',
    authCopy: 'Sign in with Google to plan the week and keep your dinner history private.',
    continueWithGoogle: 'Continue with Google',
    signOut: 'Sign out',
    greeting: 'Hey',
    greetingFallback: 'there',
    heroTitle: "What's for dinner?",
    heroCopy: 'A loose plan is still a plan.',
    firstRunEyebrow: 'A good place to start',
    firstRunTitle: 'Build your dinner rotation.',
    firstRunCopy:
      "Save the dinners you already make, then put a few on this week's plan. You can change your mind later.",
    firstRunDishesTitle: 'Add your dishes',
    firstRunDishesCopy: 'Build your list of regular dinners.',
    firstRunWeekTitle: 'Plan the week',
    firstRunWeekCopy: 'Pick what sounds good for each day.',
    mainNavigation: 'Main navigation',
    today: 'Today',
    week: 'Week',
    dishes: 'Dishes',
    thisWeek: 'This week',
    addedToHistory: 'Added to history',
    weAteThis: 'We ate this',
    remove: 'Remove',
    nothingPlanned: 'Nothing planned',
    nothingPlannedCopy: "Maybe that's exactly right.",
    pickDinner: 'Pick a dinner',
    pickFromDishes: 'Pick from your dishes',
    planDinner: 'Plan a dinner',
    addFirstDish: 'Add your first dish, then you can put it on the calendar.',
    dish: 'Dish',
    day: 'Day',
    addToWeek: 'Add to the week',
    yourDishes: 'Your dishes',
    saved: 'saved',
    notTriedYet: 'Not tried yet',
    lastHad: 'Last had',
    emptyDishes: 'Spaghetti, tacos, takeout. Start with the dinners already in your rotation.',
    addNewDish: 'Add a new dish',
    dishNameLabel: 'What do you call it?',
    dishNamePlaceholder: 'Rotisserie chicken',
    note: 'Note',
    optional: 'optional',
    notePlaceholder: 'Usually with salad and bread',
    saveDish: 'Save dish',
    recentlyEaten: 'Recently eaten',
    emptyHistory: 'Completed dinners will show up here.',
    somethingWentWrong: 'Something went wrong',
    dishAdded: 'Dish added.',
    dinnerPlanned: 'Dinner planned for',
    historyAdded: 'Added to dinner history.',
    planRemoved: 'Plan removed.',
    pageNotFound: 'That page does not exist.',
    language: 'Language',
    english: 'English',
    danish: 'Danish',
  },
  da: {
    loading: 'Indlæser LoopDish…',
    authEyebrow: 'Husk jeres aftensmad',
    authTitle: 'Jeres madplan starter her.',
    authCopy: 'Log ind med Google for at planlægge ugen og holde jeres madhistorik privat.',
    continueWithGoogle: 'Fortsæt med Google',
    signOut: 'Log ud',
    greeting: 'Hej',
    greetingFallback: 'med dig',
    heroTitle: 'Hvad skal vi have til aftensmad?',
    heroCopy: 'En løs plan er stadig en plan.',
    firstRunEyebrow: 'Et godt sted at starte',
    firstRunTitle: 'Byg jeres faste udvalg af retter.',
    firstRunCopy:
      'Gem den aftensmad, I allerede laver, og sæt et par retter på ugens madplan. I kan altid ændre planen senere.',
    firstRunDishesTitle: 'Tilføj jeres retter',
    firstRunDishesCopy: 'Lav en liste over den aftensmad, I ofte spiser.',
    firstRunWeekTitle: 'Planlæg ugen',
    firstRunWeekCopy: 'Vælg, hvad I har lyst til hver dag.',
    mainNavigation: 'Primær navigation',
    today: 'I dag',
    week: 'Uge',
    dishes: 'Retter',
    thisWeek: 'Denne uge',
    addedToHistory: 'Føjet til historikken',
    weAteThis: 'Det fik vi',
    remove: 'Fjern',
    nothingPlanned: 'Intet planlagt',
    nothingPlannedCopy: 'Måske er det lige, som det skal være.',
    pickDinner: 'Vælg aftensmad',
    pickFromDishes: 'Vælg blandt jeres retter',
    planDinner: 'Planlæg aftensmad',
    addFirstDish: 'Tilføj jeres første ret, så kan I sætte den på madplanen.',
    dish: 'Ret',
    day: 'Dag',
    addToWeek: 'Føj til ugen',
    yourDishes: 'Jeres retter',
    saved: 'gemt',
    notTriedYet: 'Ikke prøvet endnu',
    lastHad: 'Sidst spist',
    emptyDishes: 'Spaghetti, tacos, takeaway. Start med den mad, I allerede plejer at spise.',
    addNewDish: 'Tilføj en ny ret',
    dishNameLabel: 'Hvad kalder I den?',
    dishNamePlaceholder: 'Kylling med salat',
    note: 'Note',
    optional: 'valgfri',
    notePlaceholder: 'Som regel med salat og brød',
    saveDish: 'Gem ret',
    recentlyEaten: 'Senest spist',
    emptyHistory: 'Aftensmad, I har spist, vises her.',
    somethingWentWrong: 'Noget gik galt',
    dishAdded: 'Retten er tilføjet.',
    dinnerPlanned: 'Aftensmad planlagt til',
    historyAdded: 'Føjet til madhistorikken.',
    planRemoved: 'Planen er fjernet.',
    pageNotFound: 'Siden findes ikke.',
    language: 'Sprog',
    english: 'Engelsk',
    danish: 'Dansk',
  },
} as const

export type Copy = (typeof copy)[Language]

const LanguageContext = createContext<{
  language: Language
  setLanguage: (language: Language) => void
  t: Copy
} | null>(null)

const storageKey = 'loopdish-language'
const listeners = new Set<() => void>()

function getLanguage(): Language {
  const saved = window.localStorage.getItem(storageKey)
  if (saved === 'en' || saved === 'da') return saved
  return window.navigator.language.toLowerCase().startsWith('da') ? 'da' : 'en'
}

function getServerLanguage(): Language {
  return 'en'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) listener()
  }
  window.addEventListener('storage', onStorage)

  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function setLanguage(language: Language) {
  window.localStorage.setItem(storageKey, language)
  listeners.forEach((listener) => listener())
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(subscribe, getLanguage, getServerLanguage)

  return (
    <LanguageContext value={{ language, setLanguage, t: copy[language] }}>
      {children}
    </LanguageContext>
  )
}

export function useI18n() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useI18n must be used within LanguageProvider')
  return value
}
