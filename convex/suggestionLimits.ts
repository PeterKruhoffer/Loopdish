import { ConvexError } from 'convex/values'
import { getHousehold, requireHouseholdSlug } from './_lib/households'
import { internalMutation } from './_generated/server'

const dailyLimit = 5
const windowDuration = 24 * 60 * 60 * 1000

export const reserve = internalMutation({
  args: {},
  handler: async (ctx) => {
    const household = await getHousehold(ctx, await requireHouseholdSlug(ctx))
    if (!household) throw new ConvexError('Add a dish before asking for suggestions')

    const now = Date.now()
    const usage = await ctx.db
      .query('aiSuggestionUsage')
      .withIndex('by_household', (query) => query.eq('householdId', household._id))
      .unique()

    if (!usage) {
      await ctx.db.insert('aiSuggestionUsage', {
        householdId: household._id,
        windowStartedAt: now,
        count: 1,
      })
      return
    }

    if (now - usage.windowStartedAt >= windowDuration) {
      await ctx.db.patch(usage._id, { windowStartedAt: now, count: 1 })
      return
    }

    if (usage.count >= dailyLimit) {
      throw new ConvexError('This household has used its five AI suggestions for the last 24 hours')
    }
    await ctx.db.patch(usage._id, { count: usage.count + 1 })
  },
})
