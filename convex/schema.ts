import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  households: defineTable({
    name: v.string(),
    slug: v.string(),
  }).index('by_slug', ['slug']),

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
