import { ConvexError } from 'convex/values'
import type { MutationCtx, QueryCtx } from '../_generated/server'

export async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new ConvexError('Sign in to use LoopDish')
  return identity
}

export async function requireHouseholdSlug(ctx: QueryCtx | MutationCtx) {
  return (await requireIdentity(ctx)).tokenIdentifier
}

export async function getHousehold(ctx: QueryCtx | MutationCtx, slug: string) {
  const membership = await ctx.db
    .query('householdMembers')
    .withIndex('by_user', (query) => query.eq('userSlug', slug))
    .unique()
  if (membership) return await ctx.db.get(membership.householdId)

  return await ctx.db
    .query('households')
    .withIndex('by_slug', (query) => query.eq('slug', slug))
    .unique()
}

export async function getOrCreateHousehold(ctx: MutationCtx, slug: string) {
  const identity = await requireIdentity(ctx)
  let household = await getHousehold(ctx, slug)
  if (!household) {
    const householdId = await ctx.db.insert('households', {
      name: 'Our home',
      slug,
    })
    household = await ctx.db.get(householdId)
  }
  if (!household) throw new ConvexError('Could not create household')

  const membership = await ctx.db
    .query('householdMembers')
    .withIndex('by_user', (query) => query.eq('userSlug', slug))
    .unique()
  if (!membership) {
    await ctx.db.insert('householdMembers', {
      householdId: household._id,
      userSlug: slug,
      name: identity.name || identity.email?.split('@')[0] || 'You',
      email: identity.email,
      role: 'owner',
      joinedAt: Date.now(),
    })
  }

  return household
}
