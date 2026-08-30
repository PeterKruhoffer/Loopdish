import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { useMutation } from 'convex/react'
import { startTransition, useOptimistic, useState } from 'react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import type { Day } from '~/lib/dates'
import type { Dish, PlannedMeal } from './types'

type PlanUpdate =
  | { type: 'plan'; plan: PlannedMeal }
  | { type: 'complete'; planId: Id<'plannedMeals'>; completedAt: number }
  | { type: 'remove'; planId: Id<'plannedMeals'> }

const noDishes: Dish[] = []
const noPlans: PlannedMeal[] = []

export function dinnerDashboardQueryOptions(week: Day[]) {
  return convexQuery(api.dashboard.get, {
    startDate: week[0].date,
    endDate: week[week.length - 1].date,
  })
}

export function useDinnerDashboard(week: Day[]) {
  const [selectedDishId, setSelectedDishId] = useState('')
  const [selectedDates, setSelectedDates] = useState<Record<string, string>>({})

  const weekKey = week[0].date
  const storedSelectedDate = selectedDates[weekKey]
  const selectedDate = week.some((day) => day.date === storedSelectedDate)
    ? storedSelectedDate
    : (week.find((day) => day.isToday)?.date ?? weekKey)

  const dashboardQuery = useQuery(dinnerDashboardQueryOptions(week))
  const addDishMutation = useMutation(api.dishes.add)
  const planMealMutation = useMutation(api.mealPlans.plan)
  const markEatenMutation = useMutation(api.mealPlans.markEaten)
  const removePlanMutation = useMutation(api.mealPlans.remove)

  const data = dashboardQuery.data
  const [optimisticDishes, addOptimisticDish] = useOptimistic(
    data?.dishes ?? noDishes,
    (currentDishes, dish: Dish) =>
      [...currentDishes, dish].sort((a, b) => a.name.localeCompare(b.name)),
  )
  const [optimisticPlans, updateOptimisticPlans] = useOptimistic(
    data?.plannedMeals ?? noPlans,
    (currentPlans, update: PlanUpdate) => {
      switch (update.type) {
        case 'plan':
          return [...currentPlans.filter((plan) => plan.date !== update.plan.date), update.plan]
        case 'complete':
          return currentPlans.map((plan) =>
            plan._id === update.planId ? { ...plan, completedAt: update.completedAt } : plan,
          )
        case 'remove':
          return currentPlans.filter((plan) => plan._id !== update.planId)
      }
    },
  )
  const optimisticData = data
    ? { ...data, dishes: optimisticDishes, plannedMeals: optimisticPlans }
    : undefined
  const activeDishId = selectedDishId || optimisticDishes[0]?._id || ''

  async function addDishAction(name: string, notes?: string) {
    const householdId = data?.household?.id
    const trimmedName = name.trim()
    if (householdId) {
      addOptimisticDish({
        _id: crypto.randomUUID() as Id<'dishes'>,
        _creationTime: Date.now(),
        householdId,
        name: trimmedName,
        normalizedName: trimmedName.toLocaleLowerCase(),
        notes: notes?.trim() || undefined,
        timesEaten: 0,
        archived: false,
      })
    }

    const dishId = await addDishMutation({ name, notes })
    startTransition(() => setSelectedDishId(dishId))
  }

  async function planDinnerAction(dishId: string, date: string) {
    const typedDishId = dishId as Id<'dishes'>
    const dish = optimisticDishes.find((candidate) => candidate._id === typedDishId)
    const householdId = data?.household?.id
    const existingPlan = optimisticPlans.find((plan) => plan.date === date)

    if (dish && householdId) {
      updateOptimisticPlans({
        type: 'plan',
        plan: existingPlan
          ? { ...existingPlan, dishId: typedDishId, dishName: dish.name, completedAt: undefined }
          : {
              _id: crypto.randomUUID() as Id<'plannedMeals'>,
              _creationTime: Date.now(),
              householdId,
              dishId: typedDishId,
              dishName: dish.name,
              date,
            },
      })
    }

    await planMealMutation({ dishId: typedDishId, date })
  }

  async function markEatenAction(plan: PlannedMeal) {
    updateOptimisticPlans({ type: 'complete', planId: plan._id, completedAt: Date.now() })
    await markEatenMutation({ planId: plan._id })
  }

  async function removePlanAction(plan: PlannedMeal) {
    updateOptimisticPlans({ type: 'remove', planId: plan._id })
    await removePlanMutation({ planId: plan._id })
  }

  function setSelectedDate(date: string) {
    setSelectedDates((current) => ({ ...current, [weekKey]: date }))
  }

  return {
    data: optimisticData,
    isPending: dashboardQuery.isPending,
    queryError: dashboardQuery.isError && !data,
    retryDashboard: () => dashboardQuery.refetch(),
    selectedDate,
    selectedDishId: activeDishId,
    setSelectedDate,
    setSelectedDishId,
    addDishAction,
    planDinnerAction,
    markEatenAction,
    removePlanAction,
  }
}
