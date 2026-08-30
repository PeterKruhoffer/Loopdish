import { ConvexError, v } from 'convex/values'
import { getOrCreateHousehold, requireHouseholdSlug } from './_lib/households'
import { mutation } from './_generated/server'

export const add = mutation({
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
      .withIndex('by_household_name', (query) =>
        query.eq('householdId', household._id).eq('normalizedName', normalizedName),
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
