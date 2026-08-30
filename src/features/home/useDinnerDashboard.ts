import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { friendlyDate, type Day } from '~/lib/dates'
import { useI18n } from '~/lib/i18n'
import type { PlannedMeal } from './types'

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  return fallback
}

export function useDinnerDashboard(week: Day[]) {
  const { language, t } = useI18n()
  const [selectedDishId, setSelectedDishId] = useState('')
  const [selectedDate, setSelectedDate] = useState(
    week.find((day) => day.isToday)?.date ?? week[0].date,
  )
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const dashboardQuery = useQuery(
    convexQuery(api.dashboard.get, {
      startDate: week[0].date,
      endDate: week[week.length - 1].date,
    }),
  )
  const addDishMutation = useMutation(api.dishes.add)
  const planMealMutation = useMutation(api.mealPlans.plan)
  const markEatenMutation = useMutation(api.mealPlans.markEaten)
  const removePlanMutation = useMutation(api.mealPlans.remove)

  const data = dashboardQuery.data
  const activeDishId = selectedDishId || data?.dishes[0]?._id || ''

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    setMessage('')
    try {
      await action()
      setMessage(success)
      return true
    } catch (error) {
      setMessage(errorMessage(error, t.somethingWentWrong))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function addDish(name: string, notes?: string) {
    let dishId: Id<'dishes'> | undefined
    const added = await run(async () => {
      dishId = await addDishMutation({ name, notes })
    }, t.dishAdded)
    if (dishId) setSelectedDishId(dishId)
    return added
  }

  function planDinner() {
    if (!activeDishId) return
    void run(
      () =>
        planMealMutation({
          dishId: activeDishId as Id<'dishes'>,
          date: selectedDate,
        }),
      `${t.dinnerPlanned} ${friendlyDate(selectedDate, language)}.`,
    )
  }

  function markEaten(plan: PlannedMeal) {
    void run(() => markEatenMutation({ planId: plan._id }), t.historyAdded)
  }

  function removePlan(plan: PlannedMeal) {
    void run(() => removePlanMutation({ planId: plan._id }), t.planRemoved)
  }

  return {
    data,
    busy,
    message,
    selectedDate,
    selectedDishId: activeDishId,
    setSelectedDate,
    setSelectedDishId,
    addDish,
    planDinner,
    markEaten,
    removePlan,
  }
}
