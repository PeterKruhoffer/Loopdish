import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  households: defineTable({
    name: v.string(),
    slug: v.string(),
  }).index('by_slug', ['slug']),

  householdMembers: defineTable({
    householdId: v.id('households'),
    userSlug: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    role: v.union(v.literal('owner'), v.literal('member')),
    joinedAt: v.number(),
  })
    .index('by_user', ['userSlug'])
    .index('by_household', ['householdId']),

  householdInvites: defineTable({
    householdId: v.id('households'),
    createdByMemberId: v.id('householdMembers'),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
    acceptedByMemberId: v.optional(v.id('householdMembers')),
  }).index('by_household', ['householdId']),

  dishes: defineTable({
    householdId: v.id('households'),
    name: v.string(),
    normalizedName: v.string(),
    notes: v.optional(v.string()),
    lastEatenOn: v.optional(v.string()),
    timesEaten: v.number(),
    archived: v.boolean(),
  })
    .index('by_household', ['householdId'])
    .index('by_household_name', ['householdId', 'normalizedName']),

  plannedMeals: defineTable({
    householdId: v.id('households'),
    dishId: v.id('dishes'),
    date: v.string(),
    completedAt: v.optional(v.number()),
  }).index('by_household_date', ['householdId', 'date']),

  dinnerEvents: defineTable({
    householdId: v.id('households'),
    dishId: v.id('dishes'),
    eatenOn: v.string(),
    sourcePlanId: v.optional(v.id('plannedMeals')),
  }).index('by_household_date', ['householdId', 'eatenOn']),
})
