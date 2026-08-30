import { ConvexError } from 'convex/values'
import type { MutationCtx, QueryCtx } from '../_generated/server'

export async function requireHouseholdSlug(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new ConvexError('Sign in to use LoopDish')
  return identity.tokenIdentifier
}

export async function getHousehold(ctx: QueryCtx | MutationCtx, slug: string) {
  return await ctx.db
    .query('households')
    .withIndex('by_slug', (query) => query.eq('slug', slug))
    .unique()
}

export async function getOrCreateHousehold(ctx: MutationCtx, slug: string) {
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
