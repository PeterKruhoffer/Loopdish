import { ConvexError, v } from 'convex/values'
import { getHousehold, getOrCreateHousehold, requireHouseholdSlug } from './_lib/households'
import { mutation } from './_generated/server'

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
