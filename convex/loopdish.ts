import { ConvexError, v } from 'convex/values'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'

async function requireHouseholdSlug(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new ConvexError('Sign in to use LoopDish')
  return identity.tokenIdentifier
}

async function getHousehold(ctx: QueryCtx | MutationCtx, slug: string) {
  return await ctx.db
    .query('households')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .unique()
}

async function getOrCreateHousehold(ctx: MutationCtx, slug: string) {
  const household = await getHousehold(ctx, slug)
  if (household) return household

  const householdId = await ctx.db.insert('households', {
    name: 'Our home',
    slug,
  })
  const created = await ctx.db.get(householdId)
  if (!created) throw new ConvexError('Could not create household')
  return created
}

export const dashboard = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const householdSlug = await requireHouseholdSlug(ctx)
    const household = await ctx.db
      .query('households')
      .withIndex('by_slug', (q) => q.eq('slug', householdSlug))
      .unique()

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
        .withIndex('by_household', (q) => q.eq('householdId', household._id))
        .collect(),
      ctx.db
        .query('plannedMeals')
        .withIndex('by_household_date', (q) =>
          q.eq('householdId', household._id).gte('date', args.startDate).lte('date', args.endDate),
        )
        .collect(),
      ctx.db
        .query('dinnerEvents')
        .withIndex('by_household_date', (q) => q.eq('householdId', household._id))
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

export const addDish = mutation({
  args: {
    name: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const householdSlug = await requireHouseholdSlug(ctx)
    const name = args.name.trim()
    if (!name) throw new ConvexError('Give the dish a name')

    const household = await getOrCreateHousehold(ctx, householdSlug)
    const normalizedName = name.toLocaleLowerCase()
    const existing = await ctx.db
      .query('dishes')
      .withIndex('by_household_name', (q) =>
        q.eq('householdId', household._id).eq('normalizedName', normalizedName),
      )
      .unique()

    if (existing && !existing.archived) {
      throw new ConvexError(`${existing.name} is already in your dishes`)
    }
    if (existing) {
      await ctx.db.patch(existing._id, { archived: false, name })
      return existing._id
    }

    return await ctx.db.insert('dishes', {
      householdId: household._id,
      name,
      normalizedName,
      notes: args.notes?.trim() || undefined,
      timesEaten: 0,
      archived: false,
    })
  },
})

export const planMeal = mutation({
  args: {
    dishId: v.id('dishes'),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const householdSlug = await requireHouseholdSlug(ctx)
    const household = await getOrCreateHousehold(ctx, householdSlug)
    const dish = await ctx.db.get(args.dishId)
    if (!dish || dish.householdId !== household._id || dish.archived) {
      throw new ConvexError('That dish is not available in this household')
    }

    const existing = await ctx.db
      .query('plannedMeals')
      .withIndex('by_household_date', (q) =>
        q.eq('householdId', household._id).eq('date', args.date),
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

export const removePlan = mutation({
  args: { planId: v.id('plannedMeals') },
  handler: async (ctx, args) => {
    const householdSlug = await requireHouseholdSlug(ctx)
    const household = await getHousehold(ctx, householdSlug)
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
    const householdSlug = await requireHouseholdSlug(ctx)
    const household = await getHousehold(ctx, householdSlug)
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
