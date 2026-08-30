import { ConvexError, v } from 'convex/values'
import {
  getHousehold,
  getOrCreateHousehold,
  requireHouseholdSlug,
  requireIdentity,
} from './_lib/households'
import { mutation, query, type MutationCtx } from './_generated/server'

const inviteLifetime = 7 * 24 * 60 * 60 * 1000

async function requireOwner(ctx: MutationCtx) {
  const userSlug = await requireHouseholdSlug(ctx)
  const household = await getOrCreateHousehold(ctx, userSlug)
  const membership = await ctx.db
    .query('householdMembers')
    .withIndex('by_user', (query) => query.eq('userSlug', userSlug))
    .unique()
  if (!membership || membership.householdId !== household._id || membership.role !== 'owner') {
    throw new ConvexError('Only the household owner can do that')
  }
  return { household, membership }
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx)
    const household = await getHousehold(ctx, identity.tokenIdentifier)
    if (!household) {
      return {
        household: null,
        members: [],
        canManageHousehold: true,
      }
    }

    const members = await ctx.db
      .query('householdMembers')
      .withIndex('by_household', (query) => query.eq('householdId', household._id))
      .collect()

    if (members.length === 0) {
      return {
        household: { id: household._id, name: household.name },
        members: [
          {
            id: null,
            name: identity.name || identity.email?.split('@')[0] || 'You',
            email: identity.email,
            role: 'owner' as const,
            isCurrentUser: true,
          },
        ],
        canManageHousehold: true,
      }
    }

    return {
      household: { id: household._id, name: household.name },
      members: members
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map((member) => ({
          id: member._id,
          name: member.name,
          email: member.email,
          role: member.role,
          isCurrentUser: member.userSlug === identity.tokenIdentifier,
        })),
      canManageHousehold: members.some(
        (member) => member.userSlug === identity.tokenIdentifier && member.role === 'owner',
      ),
    }
  },
})

export const rename = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const name = args.name.trim()
    if (!name) throw new ConvexError('Give your household a name')
    const { household } = await requireOwner(ctx)
    await ctx.db.patch(household._id, { name })
  },
})

export const createInvite = mutation({
  args: {},
  handler: async (ctx) => {
    const { household, membership } = await requireOwner(ctx)

    return await ctx.db.insert('householdInvites', {
      householdId: household._id,
      createdByMemberId: membership._id,
      expiresAt: Date.now() + inviteLifetime,
    })
  },
})

export const getInvite = query({
  args: { inviteId: v.string() },
  handler: async (ctx, args) => {
    const inviteId = ctx.db.normalizeId('householdInvites', args.inviteId)
    if (!inviteId) return null
    const invite = await ctx.db.get(inviteId)
    if (!invite) return null
    const household = await ctx.db.get(invite.householdId)
    if (!household) return null

    return {
      householdName: household.name,
      available: !invite.acceptedAt && invite.expiresAt > Date.now(),
    }
  },
})

export const acceptInvite = mutation({
  args: { inviteId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const inviteId = ctx.db.normalizeId('householdInvites', args.inviteId)
    if (!inviteId) throw new ConvexError('That invite is not valid')
    const invite = await ctx.db.get(inviteId)
    if (!invite || invite.acceptedAt || invite.expiresAt <= Date.now()) {
      throw new ConvexError('That invite is no longer available')
    }

    const existingMembership = await ctx.db
      .query('householdMembers')
      .withIndex('by_user', (query) => query.eq('userSlug', identity.tokenIdentifier))
      .unique()
    if (existingMembership) {
      if (existingMembership.householdId === invite.householdId) {
        await ctx.db.patch(invite._id, {
          acceptedAt: Date.now(),
          acceptedByMemberId: existingMembership._id,
        })
        return
      }
      throw new ConvexError('You already belong to another household')
    }

    const legacyHousehold = await ctx.db
      .query('households')
      .withIndex('by_slug', (query) => query.eq('slug', identity.tokenIdentifier))
      .unique()
    if (legacyHousehold && legacyHousehold._id !== invite.householdId) {
      throw new ConvexError('You already have a household with saved meals')
    }

    const memberId = await ctx.db.insert('householdMembers', {
      householdId: invite.householdId,
      userSlug: identity.tokenIdentifier,
      name: identity.name || identity.email?.split('@')[0] || 'Household member',
      email: identity.email,
      role: 'member',
      joinedAt: Date.now(),
    })
    await ctx.db.patch(invite._id, {
      acceptedAt: Date.now(),
      acceptedByMemberId: memberId,
    })
  },
})
