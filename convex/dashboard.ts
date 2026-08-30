import { v } from 'convex/values'
import { getHousehold, requireHouseholdSlug } from './_lib/households'
import { query } from './_generated/server'

export const get = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const household = await getHousehold(ctx, await requireHouseholdSlug(ctx))

    if (!household) {
      return {
        household: null,
        dishes: [],
        plannedMeals: [],
        recentMeals: [],
      }
    }

    const [allDishes, plans, events] = await Promise.all([
      ctx.db
        .query('dishes')
        .withIndex('by_household', (query) => query.eq('householdId', household._id))
        .collect(),
      ctx.db
        .query('plannedMeals')
        .withIndex('by_household_date', (query) =>
          query
            .eq('householdId', household._id)
            .gte('date', args.startDate)
            .lte('date', args.endDate),
        )
        .collect(),
      ctx.db
        .query('dinnerEvents')
        .withIndex('by_household_date', (query) => query.eq('householdId', household._id))
        .order('desc')
        .take(6),
    ])

    const dishes = allDishes
      .filter((dish) => !dish.archived)
      .sort((a, b) => a.name.localeCompare(b.name))
    const dishNames = new Map(dishes.map((dish) => [dish._id, dish.name]))

    return {
      household: { id: household._id, name: household.name },
      dishes,
      plannedMeals: plans.map((plan) => ({
        ...plan,
        dishName: dishNames.get(plan.dishId) ?? 'Archived dish',
      })),
      recentMeals: events.map((event) => ({
        ...event,
        dishName: dishNames.get(event.dishId) ?? 'Archived dish',
      })),
    }
  },
})
