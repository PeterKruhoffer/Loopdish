import { ConvexError, v } from 'convex/values'
import { getHousehold, getOrCreateHousehold, requireHouseholdSlug } from './_lib/households'
import type { Doc } from './_generated/dataModel'
import { mutation } from './_generated/server'

function validDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function nextDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

export const plan = mutation({
  args: {
    dishId: v.id('dishes'),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const household = await getOrCreateHousehold(ctx, await requireHouseholdSlug(ctx))
    const dish = await ctx.db.get(args.dishId)
    if (!dish || dish.householdId !== household._id || dish.archived) {
      throw new ConvexError('That dish is not available in this household')
    }

    const existing = await ctx.db
      .query('plannedMeals')
      .withIndex('by_household_date', (query) =>
        query.eq('householdId', household._id).eq('date', args.date),
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        dishId: args.dishId,
        completedAt: undefined,
      })
      return existing._id
    }

    return await ctx.db.insert('plannedMeals', {
      householdId: household._id,
      dishId: args.dishId,
      date: args.date,
    })
  },
})

export const applySuggestion = mutation({
  args: {
    meals: v.array(
      v.object({
        date: v.string(),
        name: v.string(),
        notes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    if (args.meals.length !== 7) throw new ConvexError('A weekly plan needs seven dinners')
    const seenDates = new Set<string>()
    const meals = args.meals.map((meal) => {
      const name = meal.name.trim()
      if (!name || name.length > 80) throw new ConvexError('A suggested dish has an invalid name')
      const notes = meal.notes?.trim() || undefined
      if (notes && notes.length > 160) {
        throw new ConvexError('A suggested dish has an invalid note')
      }
      if (!validDateKey(meal.date) || seenDates.has(meal.date)) {
        throw new ConvexError('A suggested meal has an invalid date')
      }
      seenDates.add(meal.date)
      return { date: meal.date, name, normalizedName: name.toLocaleLowerCase(), notes }
    })

    const sortedDates = [...seenDates].sort()
    if (sortedDates.some((date, index) => index > 0 && date !== nextDate(sortedDates[index - 1]))) {
      throw new ConvexError('A suggested plan must cover seven consecutive days')
    }

    const household = await getOrCreateHousehold(ctx, await requireHouseholdSlug(ctx))
    const dishes = new Map<string, Doc<'dishes'> | null>()
    for (const meal of meals) {
      if (dishes.has(meal.normalizedName)) continue
      const dish = await ctx.db
        .query('dishes')
        .withIndex('by_household_name', (query) =>
          query.eq('householdId', household._id).eq('normalizedName', meal.normalizedName),
        )
        .unique()
      dishes.set(meal.normalizedName, dish)
    }
    if ([...dishes.values()].filter((dish) => !dish).length > 2) {
      throw new ConvexError('A suggested plan can add at most two new dishes')
    }

    const preservedDates: string[] = []
    for (const meal of meals) {
      const existingPlan = await ctx.db
        .query('plannedMeals')
        .withIndex('by_household_date', (query) =>
          query.eq('householdId', household._id).eq('date', meal.date),
        )
        .unique()
      if (existingPlan?.completedAt) {
        preservedDates.push(meal.date)
        continue
      }

      let dish = dishes.get(meal.normalizedName)

      if (dish?.archived) {
        await ctx.db.patch(dish._id, { archived: false, name: meal.name })
      } else if (!dish) {
        const dishId = await ctx.db.insert('dishes', {
          householdId: household._id,
          name: meal.name,
          normalizedName: meal.normalizedName,
          notes: meal.notes,
          timesEaten: 0,
          archived: false,
        })
        dish = await ctx.db.get(dishId)
        dishes.set(meal.normalizedName, dish)
      }
      if (!dish) throw new ConvexError('A suggested dish could not be saved')

      if (existingPlan) {
        await ctx.db.patch(existingPlan._id, { dishId: dish._id })
      } else {
        await ctx.db.insert('plannedMeals', {
          householdId: household._id,
          dishId: dish._id,
          date: meal.date,
        })
      }
    }
    return { preservedDates }
  },
})

export const remove = mutation({
  args: { planId: v.id('plannedMeals') },
  handler: async (ctx, args) => {
    const household = await getHousehold(ctx, await requireHouseholdSlug(ctx))
    const plan = await ctx.db.get(args.planId)
    if (!plan) return
    if (!household || plan.householdId !== household._id) {
      throw new ConvexError('That planned meal is not in your household')
    }
    if (plan.completedAt) {
      throw new ConvexError('An eaten meal cannot be removed from the plan')
    }
    await ctx.db.delete(args.planId)
  },
})

export const markEaten = mutation({
  args: { planId: v.id('plannedMeals') },
  handler: async (ctx, args) => {
    const household = await getHousehold(ctx, await requireHouseholdSlug(ctx))
    const plan = await ctx.db.get(args.planId)
    if (!plan) throw new ConvexError('That planned meal no longer exists')
    if (!household || plan.householdId !== household._id) {
      throw new ConvexError('That planned meal is not in your household')
    }
    if (plan.completedAt) return

    const dish = await ctx.db.get(plan.dishId)
    if (!dish) throw new ConvexError('That dish no longer exists')

    await ctx.db.insert('dinnerEvents', {
      householdId: plan.householdId,
      dishId: plan.dishId,
      eatenOn: plan.date,
      sourcePlanId: plan._id,
    })
    await ctx.db.patch(plan._id, { completedAt: Date.now() })
    await ctx.db.patch(dish._id, {
      lastEatenOn: plan.date,
      timesEaten: dish.timesEaten + 1,
    })
  },
})
